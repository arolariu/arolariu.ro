namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;

/// <summary>
/// Low-level (broker) persistence contract for the durable <see cref="AnalysisRun"/> aggregate, backed by a
/// dedicated Azure Cosmos DB container (<c>analysisRuns</c>).
/// </summary>
/// <remarks>
/// <para><b>Role (The Standard):</b> A broker is a thin abstraction over an external dependency (Cosmos DB). It exposes primitive CRUD /
/// query operations with minimal translation. It MUST NOT implement domain validation, cross-aggregate orchestration, authorization,
/// business workflow branching, or exception classification beyond direct dependency errors.</para>
/// <para><b>Partitioning:</b> All runs live in the single <c>"default"</c> bucket partition (see <see cref="AnalysisRun.DefaultBucket"/>)
/// for the lifetime of this design; <see cref="ClaimNextAsync"/> therefore scans a single logical partition.</para>
/// <para><b>Concurrency:</b> <see cref="ReplaceAsync"/> and the internal claim replace performed by <see cref="ClaimNextAsync"/> use
/// Cosmos DB conditional requests (<c>If-Match</c> on the run's <c>_etag</c>). A precondition failure (HTTP 412) indicates a concurrent
/// writer won the race; per the pipeline's target semantics this is an expected, benign outcome for run claiming — NOT last-write-wins —
/// and callers must treat it as "no candidate claimed this round", not as a failure.</para>
/// <para><b>Provisioning:</b> <see cref="EnsureContainerAsync"/> idempotently creates the <c>analysisRuns</c> container (partition key
/// <c>/bucket</c>) and reconciles its default time-to-live to <c>-1</c> (enabled, item-level control) across every environment
/// (Aspire, selfhost, production) so that item-level <c>ttl</c> values set by the aggregate on completion/failure are honored.</para>
/// <para><b>Cancellation:</b> All async methods accept a <see cref="CancellationToken"/> and propagate <see cref="OperationCanceledException"/>
/// unchanged; brokers never swallow or wrap cancellation.</para>
/// </remarks>
public interface IAnalysisRunBroker
{
  /// <summary>
  /// Idempotently ensures the <c>analysisRuns</c> Cosmos DB container exists and is configured with the expected
  /// partition key and default time-to-live, creating or reconciling it as needed.
  /// </summary>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <returns>A <see cref="ValueTask"/> representing the asynchronous operation.</returns>
  ValueTask EnsureContainerAsync(CancellationToken cancellationToken);

  /// <summary>
  /// Persists a newly created analysis run.
  /// </summary>
  /// <param name="run">The run to persist.</param>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <returns>The persisted <paramref name="run"/>, stamped with its Cosmos DB <c>_etag</c>.</returns>
  ValueTask<AnalysisRun> CreateAsync(AnalysisRun run, CancellationToken cancellationToken);

  /// <summary>
  /// Reads a single analysis run by identifier.
  /// </summary>
  /// <param name="runId">The identifier of the run to read.</param>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <returns>The matching run, or <c>null</c> when no run with the given identifier exists.</returns>
  ValueTask<AnalysisRun?> ReadAsync(Guid runId, CancellationToken cancellationToken);

  /// <summary>
  /// Scans the <c>"default"</c> bucket partition for the oldest claimable run (queued, or running with an expired
  /// lease) and atomically claims it for <paramref name="leaseOwner"/>, retrying against the next-oldest candidate
  /// whenever a concurrent claimer wins the optimistic-concurrency race.
  /// </summary>
  /// <param name="leaseOwner">The identifier of the worker claiming a run.</param>
  /// <param name="now">The current instant, used to evaluate lease expiry and to compute the new lease expiry.</param>
  /// <param name="leaseDuration">How long the claimed run's lease remains valid.</param>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <returns>The claimed run, stamped with its new Cosmos DB <c>_etag</c>; or <c>null</c> when no claimable run is currently available.</returns>
  ValueTask<AnalysisRun?> ClaimNextAsync(
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken);

  /// <summary>
  /// Replaces a run's stored document, enforcing that the caller last observed <paramref name="expectedETag"/>.
  /// </summary>
  /// <param name="run">The run's new state to persist.</param>
  /// <param name="expectedETag">The Cosmos DB <c>_etag</c> the caller last observed; the replace is rejected if the stored document has moved on.</param>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <returns>The persisted <paramref name="run"/>, stamped with its new Cosmos DB <c>_etag</c>.</returns>
  ValueTask<AnalysisRun> ReplaceAsync(
    AnalysisRun run,
    string expectedETag,
    CancellationToken cancellationToken);
}
