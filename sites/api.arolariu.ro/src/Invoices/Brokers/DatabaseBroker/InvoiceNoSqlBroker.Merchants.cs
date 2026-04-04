namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.Azure.Cosmos;

using arolariu.Backend.Common.Telemetry.Tracing;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


public partial class InvoiceNoSqlBroker
{
  /// <inheritdoc/>
  public async ValueTask<Merchant> CreateMerchantAsync(Merchant merchant, CancellationToken cancellationToken = default)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "merchants", "create");
    
    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");
    var response = await container
      .CreateItemAsync(merchant, cancellationToken: cancellationToken)
      .ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "create", "merchants");
    activity?.RecordSuccess();

    var insertedMerchant = response.Resource;
    return insertedMerchant;
  }

  /// <inheritdoc/>
  public async ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId = null, CancellationToken cancellationToken = default)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "merchants", "read", parentCompanyId?.ToString());
    
    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");

    if (parentCompanyId.HasValue)
    {
      activity?.SetTag("db.query.type", "point_read");
      
      // We have the partition key for the merchant, so we can perform a targeted query (point read).
      var partitionKey = new PartitionKey(parentCompanyId.Value.ToString());
      var response = await container.ReadItemAsync<Merchant>(merchantIdentifier.ToString(), partitionKey, cancellationToken: cancellationToken).ConfigureAwait(false);

      activity?.SetCosmosDbRequestCharge(response.RequestCharge);
      InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "read", "merchants");
      activity?.RecordSuccess();

      var merchant = response.Resource;
      return merchant is not null && merchant.IsSoftDeleted
        ? throw new InvalidOperationException($"The merchant with identifier {merchantIdentifier} does not exist!")
        : merchant;
    }
    else
    {
      activity?.SetTag("db.query.type", "cross_partition");
      activity?.SetDbStatement("SELECT * FROM c WHERE c.id = @merchantIdentifier");
      
      // We don't have a partition key for the merchant, only the id, so we perform a greedy query
      var query = new QueryDefinition($"SELECT * FROM c WHERE c.id = @merchantIdentifier")
        .WithParameter("@merchantIdentifier", merchantIdentifier);

      var iterator = container.GetItemQueryIterator<Merchant>(query);
      var response = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);

      activity?.SetCosmosDbRequestCharge(response.RequestCharge);
      InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "query", "merchants");
      activity?.RecordSuccess();

      var merchant = response.Resource.Any() ? response.Resource.First() : null;
      return merchant is not null && merchant.IsSoftDeleted
        ? throw new InvalidOperationException($"The merchant with identifier {merchantIdentifier} does not exist!.")
        : merchant;
    }
  }

  /// <inheritdoc/>
  public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId, CancellationToken cancellationToken = default)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
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
      var response = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;
      merchantList.AddRange(response);
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(totalRequestCharge, "query", "merchants");
    activity?.SetTag("result.total_count", merchantList.Count);

    var filteredMerchants = merchantList.Where(merchant => merchant.IsSoftDeleted == false);
    activity?.SetTag("result.filtered_count", filteredMerchants.Count());
    activity?.RecordSuccess();
    
    return filteredMerchants;
  }

  /// <inheritdoc/>
  public async ValueTask<Merchant> UpdateMerchantAsync(Guid merchantIdentifier, Merchant updatedMerchant, CancellationToken cancellationToken = default)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "merchants", "upsert");
    
    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");

    var merchant = await ReadMerchantAsync(merchantIdentifier, cancellationToken: cancellationToken).ConfigureAwait(false);
    var partitionKey = new PartitionKey(merchant?.ParentCompanyId.ToString());

    var response = await container
      .ReplaceItemAsync(updatedMerchant, merchantIdentifier.ToString(), partitionKey, cancellationToken: cancellationToken)
      .ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "upsert", "merchants");
    activity?.RecordSuccess();

    var newMerchant = response.Resource;
    return newMerchant;
  }

  /// <inheritdoc/>
  public async ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant, CancellationToken cancellationToken = default)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "merchants", "upsert", currentMerchant?.ParentCompanyId.ToString());
    
    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");

    var partitionKey = new PartitionKey(currentMerchant?.ParentCompanyId.ToString());
    var response = await container
      .UpsertItemAsync(updatedMerchant, partitionKey, cancellationToken: cancellationToken)
      .ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "upsert", "merchants");
    activity?.RecordSuccess();

    var newMerchant = response.Resource;
    return newMerchant;
  }

  /// <inheritdoc/>
  public async ValueTask DeleteMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId = null, CancellationToken cancellationToken = default)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "merchants", "soft_delete", parentCompanyId?.ToString());
    
    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("merchants");
    var totalRequestCharge = 0.0;

    if (parentCompanyId.HasValue)
    {
      activity?.SetTag("db.query.type", "point_read_then_replace");
      
      // We have the partition key for the merchant, so we can perform a targeted query (point read).
      var partitionKey = new PartitionKey(parentCompanyId.Value.ToString());
      var response = await container.ReadItemAsync<Merchant>(merchantIdentifier.ToString(), partitionKey, cancellationToken: cancellationToken).ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;
      
      var merchant = response.Resource;
      if (merchant is not null)
      {
        merchant.SoftDelete();
        activity?.AddCustomEvent("merchant.soft_deleted");
        
        var merchantKey = merchant.id.ToString();
        await container
          .ReplaceItemAsync(merchant, merchantKey, partitionKey, cancellationToken: cancellationToken)
          .ConfigureAwait(false);
      }
    }
    else
    {
      activity?.SetTag("db.query.type", "cross_partition_query_then_replace");
      activity?.SetDbStatement("SELECT * FROM c WHERE c.id = @merchantIdentifier");
      
      // We do not have a partition key for the merchant, so we perform a greedy search.
      var query = new QueryDefinition($"SELECT * FROM c WHERE c.id = @merchantIdentifier")
        .WithParameter("@merchantIdentifier", merchantIdentifier);

      var iterator = container.GetItemQueryIterator<Merchant>(query);
      var response = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;

      var merchant = response.Resource.Any() ? response.Resource.First() : null;
      if (merchant is not null)
      {
        merchant.SoftDelete();
        activity?.AddCustomEvent("merchant.soft_deleted");

        var merchantKey = merchant.id.ToString();
        var partitionKey = new PartitionKey(merchant.ParentCompanyId.ToString());

        await container
          .ReplaceItemAsync(merchant, merchantKey, partitionKey, cancellationToken: cancellationToken)
          .ConfigureAwait(false);
      }
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(totalRequestCharge, "delete", "merchants");
    activity?.RecordSuccess();
  }
}
