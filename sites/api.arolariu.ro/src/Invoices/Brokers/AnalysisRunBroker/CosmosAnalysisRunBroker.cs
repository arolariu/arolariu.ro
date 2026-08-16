namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Modules;

using Microsoft.Azure.Cosmos;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Direct Azure Cosmos DB SDK implementation of <see cref="IAnalysisRunBroker"/> for the <c>analysisRuns</c> container.
/// </summary>
/// <remarks>
/// <para><b>Design:</b> Unlike <c>InvoiceNoSqlBroker</c>, this broker does NOT go through Entity Framework Core — it issues
/// raw Cosmos SDK calls directly against the shared <see cref="CosmosClient"/>, because <see cref="AnalysisRun"/> requires
/// precise control over optimistic-concurrency (<c>_etag</c>/<c>If-Match</c>) semantics and per-item TTL that the EF Core
/// Cosmos provider does not expose cleanly.</para>
/// <para><b>Partitioning:</b> Single partition key path <c>/bucket</c>; every run currently lives in the
/// <see cref="AnalysisRun.DefaultBucket"/> bucket.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed class CosmosAnalysisRunBroker : IAnalysisRunBroker
{
  private const string DatabaseId = "primary";
  private const string ContainerId = "analysisRuns";
  private const string PartitionKeyPath = "/bucket";

  private readonly CosmosClient cosmosClient;

  /// <summary>
  /// Initializes a new instance of the <see cref="CosmosAnalysisRunBroker"/> class.
  /// </summary>
  /// <param name="cosmosClient">The shared <see cref="CosmosClient"/> instance (pooled / singleton at composition root).</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="cosmosClient"/> is null.</exception>
  public CosmosAnalysisRunBroker(CosmosClient cosmosClient)
  {
    ArgumentNullException.ThrowIfNull(cosmosClient);
    this.cosmosClient = cosmosClient;
  }

  /// <inheritdoc/>
  public async ValueTask EnsureContainerAsync(CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureContainerAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosAnalysisRunBroker))
      .SetCosmosDbContext(DatabaseId, ContainerId, "ensure_container");

    var database = cosmosClient.GetDatabase(DatabaseId);
    var desiredProperties = new ContainerProperties(ContainerId, PartitionKeyPath)
    {
      DefaultTimeToLive = -1,
    };

    var containerResponse = await TranslateAnalysisRunCosmosAsync(
      () => database.CreateContainerIfNotExistsAsync(desiredProperties, cancellationToken: cancellationToken),
      runId: null).ConfigureAwait(false);

    // CreateContainerIfNotExistsAsync does not reconcile settings on an already-existing container with a
    // different default TTL (e.g. one provisioned before this design, or restored from a backup). Patch it
    // idempotently so every environment (Aspire, selfhost, production) honors item-level TTL consistently.
    if (containerResponse.Resource.DefaultTimeToLive != -1)
    {
      var existingProperties = containerResponse.Resource;
      existingProperties.DefaultTimeToLive = -1;

      await TranslateAnalysisRunCosmosAsync(
        () => containerResponse.Container.ReplaceContainerAsync(existingProperties, cancellationToken: cancellationToken),
        runId: null).ConfigureAwait(false);
    }

    activity?.RecordSuccess();
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisRun> CreateAsync(AnalysisRun run, CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(run);

    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosAnalysisRunBroker))
      .SetCosmosDbContext(DatabaseId, ContainerId, "create", run.Bucket);

    var container = GetContainer();
    var partitionKey = new PartitionKey(run.Bucket);

    var response = await TranslateAnalysisRunCosmosAsync(
      () => container.CreateItemAsync(run, partitionKey, cancellationToken: cancellationToken),
      run.Id).ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "create", ContainerId);
    activity?.RecordSuccess();

    return response.Resource.WithETag(response.ETag);
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisRun?> ReadAsync(Guid runId, CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosAnalysisRunBroker))
      .SetCosmosDbContext(DatabaseId, ContainerId, "read", AnalysisRun.DefaultBucket);

    var container = GetContainer();
    var partitionKey = new PartitionKey(AnalysisRun.DefaultBucket);

    try
    {
      var response = await container.ReadItemAsync<AnalysisRun>(
        runId.ToString(), partitionKey, cancellationToken: cancellationToken).ConfigureAwait(false);

      activity?.SetCosmosDbRequestCharge(response.RequestCharge);
      InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "read", ContainerId);
      activity?.RecordSuccess();

      return response.Resource.WithETag(response.ETag);
    }
    catch (CosmosException cosmosException) when (cosmosException.StatusCode == HttpStatusCode.NotFound)
    {
      activity?.RecordSuccess();
      return null;
    }
    catch (CosmosException cosmosException)
    {
      throw TranslateAnalysisRunCosmos(cosmosException, runId);
    }
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisRun?> ClaimNextAsync(
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);

    using var activity = InvoicePackageTracing.StartActivity(nameof(ClaimNextAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosAnalysisRunBroker))
      .SetCosmosDbContext(DatabaseId, ContainerId, "claim", AnalysisRun.DefaultBucket)
      .SetDbStatement(
        "SELECT * FROM c WHERE c.bucket = @bucket AND (c.status = 'Queued' OR (c.status = 'Running' AND c.leaseExpiresAt <= @now)) ORDER BY c.acceptedAt ASC");

    var container = GetContainer();
    var query = new QueryDefinition(
        "SELECT * FROM c WHERE c.bucket = @bucket AND (c.status = 'Queued' OR (c.status = 'Running' AND c.leaseExpiresAt <= @now)) ORDER BY c.acceptedAt ASC")
      .WithParameter("@bucket", AnalysisRun.DefaultBucket)
      .WithParameter("@now", now);

    var partitionKey = new PartitionKey(AnalysisRun.DefaultBucket);
    var iterator = container.GetItemQueryIterator<AnalysisRun>(query, requestOptions: new QueryRequestOptions
    {
      PartitionKey = partitionKey,
    });

    var totalRequestCharge = 0.0;
    try
    {
      while (iterator.HasMoreResults)
      {
        cancellationToken.ThrowIfCancellationRequested();

        var page = await TranslateAnalysisRunCosmosAsync(
          () => iterator.ReadNextAsync(cancellationToken),
          runId: null).ConfigureAwait(false);
        totalRequestCharge += page.RequestCharge;

        foreach (var candidate in page)
        {
          AnalysisRun claimed;
          try
          {
            claimed = candidate.Claim(leaseOwner, now, leaseDuration);
          }
          catch (InvalidAnalysisRunTransitionException)
          {
            // The candidate's state moved on between the scan and the claim attempt; skip it.
            continue;
          }

          try
          {
            var replaceOptions = new ItemRequestOptions { IfMatchEtag = candidate.ETag };
            var replaceResponse = await container.ReplaceItemAsync(
              claimed, claimed.Id.ToString(), partitionKey, replaceOptions, cancellationToken).ConfigureAwait(false);
            totalRequestCharge += replaceResponse.RequestCharge;

            activity?.SetCosmosDbRequestCharge(totalRequestCharge);
            InvoiceMetrics.RecordCosmosDbCharge(totalRequestCharge, "claim", ContainerId);
            activity?.RecordSuccess();

            return replaceResponse.Resource.WithETag(replaceResponse.ETag);
          }
          catch (CosmosException cosmosException) when (
            cosmosException.StatusCode is HttpStatusCode.PreconditionFailed or HttpStatusCode.NotFound)
          {
            // A concurrent worker already claimed (or the run was otherwise mutated/removed); try the next candidate.
            continue;
          }
        }
      }
    }
    catch (CosmosException cosmosException)
    {
      throw TranslateAnalysisRunCosmos(cosmosException, runId: null);
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(totalRequestCharge, "claim", ContainerId);
    activity?.SetTag("result.claimed", false);
    activity?.RecordSuccess();
    return null;
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisRun> ReplaceAsync(
    AnalysisRun run,
    string expectedETag,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(run);
    ArgumentException.ThrowIfNullOrWhiteSpace(expectedETag);

    using var activity = InvoicePackageTracing.StartActivity(nameof(ReplaceAsync));
    activity?
      .SetLayerContext("Broker", nameof(CosmosAnalysisRunBroker))
      .SetCosmosDbContext(DatabaseId, ContainerId, "replace", run.Bucket);

    var container = GetContainer();
    var partitionKey = new PartitionKey(run.Bucket);
    var options = new ItemRequestOptions { IfMatchEtag = expectedETag };

    var response = await TranslateAnalysisRunCosmosAsync(
      () => container.ReplaceItemAsync(run, run.Id.ToString(), partitionKey, options, cancellationToken),
      run.Id).ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    InvoiceMetrics.RecordCosmosDbCharge(response.RequestCharge, "replace", ContainerId);
    activity?.RecordSuccess();

    return response.Resource.WithETag(response.ETag);
  }

  private Container GetContainer() => cosmosClient.GetDatabase(DatabaseId).GetContainer(ContainerId);

  /// <summary>Executes a Cosmos operation returning <typeparamref name="T"/> and maps any
  /// <see cref="CosmosException"/> onto a typed analysis run inner exception.</summary>
  private static async Task<T> TranslateAnalysisRunCosmosAsync<T>(Func<Task<T>> operation, Guid? runId)
  {
    try
    {
      return await operation().ConfigureAwait(false);
    }
    catch (CosmosException cosmosException)
    {
      throw TranslateAnalysisRunCosmos(cosmosException, runId);
    }
  }

  /// <summary>Maps a <see cref="CosmosException"/> status code to the corresponding analysis run inner exception type.</summary>
  private static Exception TranslateAnalysisRunCosmos(CosmosException cosmosException, Guid? runId) =>
    cosmosException.StatusCode switch
    {
      HttpStatusCode.NotFound => runId.HasValue
        ? new AnalysisRunNotFoundException(runId.Value, cosmosException)
        : new AnalysisRunNotFoundException("Analysis run not found.", cosmosException),
      HttpStatusCode.PreconditionFailed => runId.HasValue
        ? new AnalysisRunLeaseConflictException($"Analysis run '{runId.Value}' was modified concurrently; the expected revision is stale.", cosmosException)
        : new AnalysisRunLeaseConflictException("An analysis run was modified concurrently; the expected revision is stale.", cosmosException),
      HttpStatusCode.TooManyRequests => new AnalysisRunCosmosDbRateLimitException(
        cosmosException.RetryAfter ?? TimeSpan.FromSeconds(1), cosmosException),
      _ => cosmosException,
    };
}
