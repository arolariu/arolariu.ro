namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using Microsoft.Azure.Cosmos;


using arolariu.Backend.Common.Telemetry.Tracing;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


public partial class CosmosDatabaseBroker
{
  /// <inheritdoc/>
  public async ValueTask<Merchant> CreateMerchantAsync(Merchant merchant, CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext("primary", "merchants", "create");

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");
    var response = await TranslateMerchantCosmosAsync(
      () => container.CreateItemAsync(merchant, cancellationToken: cancellationToken),
      merchant?.id).ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "create", "merchants");
    activity?.RecordSuccess();

    var insertedMerchant = response.Resource;
    return insertedMerchant;
  }

  /// <inheritdoc/>
  public async ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext("primary", "merchants", "read", parentCompanyId?.ToString());

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");

    Merchant? merchant;
    if (parentCompanyId.HasValue)
    {
      activity?.SetTag("db.query.type", "point_read");

      // We have the partition key for the merchant, so we can perform a targeted query (point read).
      var partitionKey = new PartitionKey(parentCompanyId.Value.ToString());
      var response = await TranslateMerchantCosmosAsync(
        () => container.ReadItemAsync<Merchant>(merchantIdentifier.ToString(), partitionKey, cancellationToken: cancellationToken),
        merchantIdentifier).ConfigureAwait(false);

      activity?.SetCosmosDbRequestCharge(response.RequestCharge);
      InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "read", "merchants");
      merchant = response.Resource;
    }
    else
    {
      activity?.SetTag("db.query.type", "cross_partition");
      activity?.SetDbStatement("SELECT * FROM c WHERE c.id = @merchantIdentifier");

      // We don't have a partition key for the merchant, only the id, so we perform a greedy query
      var query = new QueryDefinition($"SELECT * FROM c WHERE c.id = @merchantIdentifier")
        .WithParameter("@merchantIdentifier", merchantIdentifier);

      using var iterator = container.GetItemQueryIterator<Merchant>(query);
      double totalCharge = 0;
      merchant = null;
      while (merchant is null && iterator.HasMoreResults)
      {
        cancellationToken.ThrowIfCancellationRequested();
        var response = await TranslateMerchantCosmosAsync(
          () => iterator.ReadNextAsync(cancellationToken),
          merchantIdentifier).ConfigureAwait(false);
        totalCharge += response.RequestCharge;
        merchant = response.Resource.FirstOrDefault();
      }

      activity?.SetCosmosDbRequestCharge(totalCharge);
      InvoiceMetrics.RecordCosmosDbCharge(totalCharge, "query", "merchants");
    }

    if (merchant?.IsSoftDeleted == true) throw new MerchantLockedException(merchantIdentifier);
    activity?.RecordSuccess();
    return merchant;
  }

  /// <inheritdoc/>
  public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId, CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext("primary", "merchants", "query", parentCompanyId.ToString())
      .SetDbStatement("SELECT * FROM c WHERE c.ParentCompanyId = @parentCompanyId");

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");
    var merchantList = new List<Merchant>();
    var totalRequestCharge = 0.0;

    // We have the partition key for the merchant, so we can perform a targeted query.
    var query = new QueryDefinition($"SELECT * FROM c WHERE c.ParentCompanyId = @parentCompanyId")
      .WithParameter("@parentCompanyId", parentCompanyId);

    var iterator = container.GetItemQueryIterator<Merchant>(query);
    while (iterator.HasMoreResults)
    {
      cancellationToken.ThrowIfCancellationRequested();
      var response = await TranslateMerchantCosmosAsync(
        () => iterator.ReadNextAsync(cancellationToken),
        null).ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;
      merchantList.AddRange(response);
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(totalRequestCharge, "query", "merchants");
    activity?.SetTag("result.total_count", merchantList.Count);

    var filteredMerchants = merchantList.Where(merchant => merchant.IsSoftDeleted == false).ToList();
    activity?.SetTag("result.filtered_count", filteredMerchants.Count);
    activity?.RecordSuccess();

    return filteredMerchants;
  }

  /// <inheritdoc/>
  public async ValueTask<IEnumerable<Merchant>> ReadMerchantsByIdentifiersAsync(
    IReadOnlyCollection<Guid> merchantIdentifiers,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(merchantIdentifiers);

    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsByIdentifiersAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext("primary", "merchants", "query")
      .SetDbStatement("SELECT * FROM c WHERE c.id IN (@ids)");

    if (merchantIdentifiers.Count == 0)
    {
      activity?.SetTag("result.total_count", 0);
      activity?.RecordSuccess();
      return [];
    }

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");
    var merchantList = new List<Merchant>();
    var totalRequestCharge = 0.0;

    foreach (var chunk in merchantIdentifiers.Chunk(100))
    {
      var parameterNames = chunk.Select((_, index) => $"@id{index}").ToArray();
      var query = new QueryDefinition($"SELECT * FROM c WHERE c.id IN ({string.Join(", ", parameterNames)})");

      for (var index = 0; index < chunk.Length; index++)
      {
        query = query.WithParameter(parameterNames[index], chunk[index].ToString());
      }

      var iterator = container.GetItemQueryIterator<Merchant>(query);
      while (iterator.HasMoreResults)
      {
        var response = await TranslateMerchantCosmosAsync(
          () => iterator.ReadNextAsync(cancellationToken),
          null).ConfigureAwait(false);
        totalRequestCharge += response.RequestCharge;
        merchantList.AddRange(response);
      }
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(totalRequestCharge, "query", "merchants");
    activity?.SetTag("result.total_count", merchantList.Count);

    var filteredMerchants = merchantList.Where(merchant => merchant.IsSoftDeleted == false).ToList();
    activity?.SetTag("result.filtered_count", filteredMerchants.Count);
    activity?.RecordSuccess();

    return filteredMerchants;
  }

  /// <inheritdoc/>
  public async ValueTask<Merchant> UpdateMerchantAsync(Merchant updatedMerchant, CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(updatedMerchant);

    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext("primary", "merchants", "replace", updatedMerchant.ParentCompanyId.ToString());

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");

    var partitionKey = new PartitionKey(updatedMerchant.ParentCompanyId.ToString());
    var response = await TranslateMerchantCosmosAsync(
      () => container.ReplaceItemAsync(updatedMerchant, updatedMerchant.id.ToString(), partitionKey, cancellationToken: cancellationToken),
      updatedMerchant.id).ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "replace", "merchants");
    activity?.RecordSuccess();

    return response.Resource;
  }

  /// <summary>Executes a Cosmos operation returning <typeparamref name="T"/> and maps any
  /// <see cref="CosmosException"/> onto a typed merchant inner exception.</summary>
  private static async Task<T> TranslateMerchantCosmosAsync<T>(Func<Task<T>> operation, Guid? merchantIdentifier)
  {
    try
    {
      return await operation().ConfigureAwait(false);
    }
    catch (CosmosException cosmosException)
    {
      throw TranslateMerchantCosmos(cosmosException, merchantIdentifier);
    }
  }

  /// <summary>Maps a <see cref="CosmosException"/> status code to the corresponding merchant inner exception type.</summary>
  private static Exception TranslateMerchantCosmos(CosmosException cosmosException, Guid? merchantIdentifier) =>
    cosmosException.StatusCode switch
    {
      HttpStatusCode.NotFound => merchantIdentifier.HasValue
        ? new MerchantNotFoundException(merchantIdentifier.Value, cosmosException)
        : new MerchantNotFoundException("Merchant not found.", cosmosException),
      HttpStatusCode.Conflict => merchantIdentifier.HasValue
        ? new MerchantAlreadyExistsException(merchantIdentifier.Value, cosmosException)
        : new MerchantAlreadyExistsException("Merchant already exists.", cosmosException),
      HttpStatusCode.Unauthorized => new MerchantUnauthorizedAccessException(
        "Cosmos DB rejected the request as unauthorized.", cosmosException),
      HttpStatusCode.Forbidden => new MerchantForbiddenAccessException(
        "Cosmos DB forbade the requested merchant operation.", cosmosException),
      HttpStatusCode.TooManyRequests => new MerchantCosmosDbRateLimitException(
        cosmosException.RetryAfter ?? TimeSpan.FromSeconds(1), cosmosException),
      HttpStatusCode.ServiceUnavailable
        or HttpStatusCode.InternalServerError
        or HttpStatusCode.GatewayTimeout
        or HttpStatusCode.RequestTimeout => new MerchantFailedStorageException(
          "Cosmos DB dependency failed while operating on a merchant.", cosmosException),
      _ => new MerchantFailedStorageException(
        $"Cosmos DB returned an unexpected status code {(int)cosmosException.StatusCode} for a merchant operation.",
        cosmosException),
    };
}
