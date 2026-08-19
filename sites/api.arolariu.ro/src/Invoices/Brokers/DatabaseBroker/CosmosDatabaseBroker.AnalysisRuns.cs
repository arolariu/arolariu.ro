namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Net;
using System.Runtime.CompilerServices;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Modules;

using Microsoft.Azure.Cosmos;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>Implements the durable analysis queue region of <see cref="CosmosDatabaseBroker"/>.</summary>
public sealed partial class CosmosDatabaseBroker
{
  private const string DatabaseId = "primary";
  private const string AnalysisQueueContainerId = "analysisRuns";
  private const string AnalysisQueuePartitionKeyPath = "/bucket";

  private const string ClaimCandidateQuery =
    "SELECT * FROM c WHERE c.bucket = @bucket AND (c.status = 'Queued' OR (c.status = 'Running' AND c.leaseExpiresAt <= @now)) ORDER BY c.acceptedAt ASC";

  private const string PendingCountQuery =
    "SELECT c.targetType AS targetType, COUNT(1) AS count FROM c WHERE c.bucket = @bucket AND (c.status = 'Queued' OR (c.status = 'Running' AND c.leaseExpiresAt <= @now)) GROUP BY c.targetType";

  /// <inheritdoc/>
  public async ValueTask EnsureAnalysisQueueAsync(CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisQueueAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext(DatabaseId, AnalysisQueueContainerId, "ensure_container");

    var database = CosmosClient.GetDatabase(DatabaseId);
    var desiredProperties = new ContainerProperties(
      AnalysisQueueContainerId,
      AnalysisQueuePartitionKeyPath)
    {
      DefaultTimeToLive = -1,
    };

    var response = await TranslateAnalysisRunCosmosAsync(
      () => database.CreateContainerIfNotExistsAsync(
        desiredProperties,
        cancellationToken: cancellationToken),
      runId: null).ConfigureAwait(false);

    if (response.Resource.DefaultTimeToLive != -1)
    {
      ContainerProperties properties = response.Resource;
      properties.DefaultTimeToLive = -1;
      await TranslateAnalysisRunCosmosAsync(
        () => response.Container.ReplaceContainerAsync(
          properties,
          cancellationToken: cancellationToken),
        runId: null).ConfigureAwait(false);
    }

    activity?.RecordSuccess();
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisRun> CreateAnalysisRunAsync(
    AnalysisRun run,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(run);
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateAnalysisRunAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext(DatabaseId, AnalysisQueueContainerId, "create", run.Bucket);

    Container container = GetAnalysisQueueContainer();
    var response = await TranslateAnalysisRunCosmosAsync(
      () => container.CreateItemAsync(
        run,
        new PartitionKey(run.Bucket),
        cancellationToken: cancellationToken),
      run.Id).ConfigureAwait(false);

    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "create", AnalysisQueueContainerId);
    activity?.RecordSuccess();
    return response.Resource.WithETag(response.ETag);
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisRun?> ReadAnalysisRunAsync(
    Guid runId,
    CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAnalysisRunAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext(
        DatabaseId,
        AnalysisQueueContainerId,
        "read",
        AnalysisRun.DefaultBucket);

    try
    {
      var response = await GetAnalysisQueueContainer()
        .ReadItemAsync<AnalysisRun>(
          runId.ToString(),
          new PartitionKey(AnalysisRun.DefaultBucket),
          cancellationToken: cancellationToken)
        .ConfigureAwait(false);
      InvoiceMetrics.RecordCosmosDbCharge(
        response.RequestCharge,
        "read",
        AnalysisQueueContainerId);
      activity?.RecordSuccess();
      return response.Resource.WithETag(response.ETag);
    }
    catch (CosmosException exception) when (exception.StatusCode == HttpStatusCode.NotFound)
    {
      activity?.RecordSuccess();
      return null;
    }
    catch (CosmosException exception)
    {
      throw TranslateAnalysisRunCosmos(exception, runId);
    }
  }

  /// <inheritdoc/>
  public async IAsyncEnumerable<AnalysisRun> StreamAnalysisRunClaimCandidatesAsync(
    DateTimeOffset now,
    [EnumeratorCancellation] CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(
      nameof(StreamAnalysisRunClaimCandidatesAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext(
        DatabaseId,
        AnalysisQueueContainerId,
        "claim_candidates",
        AnalysisRun.DefaultBucket)
      .SetDbStatement(ClaimCandidateQuery);

    var query = new QueryDefinition(ClaimCandidateQuery)
      .WithParameter("@bucket", AnalysisRun.DefaultBucket)
      .WithParameter("@now", now);
    using var iterator = GetAnalysisQueueContainer().GetItemQueryIterator<AnalysisRun>(
      query,
      requestOptions: new QueryRequestOptions
      {
        PartitionKey = new PartitionKey(AnalysisRun.DefaultBucket),
      });

    while (iterator.HasMoreResults)
    {
      cancellationToken.ThrowIfCancellationRequested();
      var page = await TranslateAnalysisRunCosmosAsync(
        () => iterator.ReadNextAsync(cancellationToken),
        runId: null).ConfigureAwait(false);
      InvoiceMetrics.RecordCosmosDbCharge(
        page.RequestCharge,
        "claim_candidates",
        AnalysisQueueContainerId);
      foreach (AnalysisRun candidate in page)
      {
        yield return candidate.WithETag(candidate.ETag);
      }
    }

    activity?.RecordSuccess();
  }

  /// <inheritdoc/>
  public async ValueTask<IReadOnlyDictionary<AnalysisTargetType, long>>
    CountPendingAnalysisRunsByTargetTypeAsync(
      DateTimeOffset now,
      CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(
      nameof(CountPendingAnalysisRunsByTargetTypeAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext(
        DatabaseId,
        AnalysisQueueContainerId,
        "count_pending",
        AnalysisRun.DefaultBucket)
      .SetDbStatement(PendingCountQuery);

    var query = new QueryDefinition(PendingCountQuery)
      .WithParameter("@bucket", AnalysisRun.DefaultBucket)
      .WithParameter("@now", now);
    using var iterator = GetAnalysisQueueContainer()
      .GetItemQueryIterator<PendingCountProjection>(
        query,
        requestOptions: new QueryRequestOptions
        {
          PartitionKey = new PartitionKey(AnalysisRun.DefaultBucket),
        });

    var counts = new Dictionary<AnalysisTargetType, long>();
    while (iterator.HasMoreResults)
    {
      cancellationToken.ThrowIfCancellationRequested();
      var page = await TranslateAnalysisRunCosmosAsync(
        () => iterator.ReadNextAsync(cancellationToken),
        runId: null).ConfigureAwait(false);
      InvoiceMetrics.RecordCosmosDbCharge(
        page.RequestCharge,
        "count_pending",
        AnalysisQueueContainerId);
      foreach (PendingCountProjection projection in page)
      {
        counts[projection.TargetType] = projection.Count;
      }
    }

    activity?.RecordSuccess();
    return counts;
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisRun> ReplaceAnalysisRunAsync(
    AnalysisRun run,
    string expectedETag,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(run);
    ArgumentException.ThrowIfNullOrWhiteSpace(expectedETag);

    using var activity = InvoicePackageTracing.StartActivity(nameof(ReplaceAnalysisRunAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosDatabaseBroker))
      .SetCosmosDbContext(
        DatabaseId,
        AnalysisQueueContainerId,
        "replace",
        run.Bucket);

    var response = await TranslateAnalysisRunCosmosAsync(
      () => GetAnalysisQueueContainer().ReplaceItemAsync(
        run,
        run.Id.ToString(),
        new PartitionKey(run.Bucket),
        new ItemRequestOptions { IfMatchEtag = expectedETag },
        cancellationToken),
      run.Id).ConfigureAwait(false);

    InvoiceMetrics.RecordCosmosDbCharge(
      response.RequestCharge,
      "replace",
      AnalysisQueueContainerId);
    activity?.RecordSuccess();
    return response.Resource.WithETag(response.ETag);
  }

  private Container GetAnalysisQueueContainer() =>
    CosmosClient.GetDatabase(DatabaseId).GetContainer(AnalysisQueueContainerId);

  private static async Task<T> TranslateAnalysisRunCosmosAsync<T>(
    Func<Task<T>> operation,
    Guid? runId)
  {
    try
    {
      return await operation().ConfigureAwait(false);
    }
    catch (CosmosException exception)
    {
      throw TranslateAnalysisRunCosmos(exception, runId);
    }
  }

  private static Exception TranslateAnalysisRunCosmos(
    CosmosException exception,
    Guid? runId) =>
    exception.StatusCode switch
    {
      HttpStatusCode.NotFound => runId.HasValue
        ? new AnalysisRunNotFoundException(runId.Value, exception)
        : new AnalysisRunNotFoundException("Analysis run not found.", exception),
      HttpStatusCode.PreconditionFailed => runId.HasValue
        ? new AnalysisRunLeaseConflictException(
          $"Analysis run '{runId.Value}' was modified concurrently; the expected revision is stale.",
          exception)
        : new AnalysisRunLeaseConflictException(
          "An analysis run was modified concurrently; the expected revision is stale.",
          exception),
      HttpStatusCode.TooManyRequests => new AnalysisRunCosmosDbRateLimitException(
        exception.RetryAfter ?? TimeSpan.FromSeconds(1),
        exception),
      _ => exception,
    };

  private sealed record PendingCountProjection(
    [property: JsonPropertyName("targetType")] AnalysisTargetType TargetType,
    [property: JsonPropertyName("count")] long Count);
}
