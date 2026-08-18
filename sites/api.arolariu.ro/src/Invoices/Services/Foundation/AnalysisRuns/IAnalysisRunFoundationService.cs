namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Foundation (core) contract for the durable <see cref="AnalysisRun"/> queue: provisioning, acceptance, claim,
/// lease renewal, and terminal completion/failure of a single analysis run.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> A foundation service encapsulates direct interaction with persistence concerns (through the
/// <c>IAnalysisRunBroker</c>) plus essential domain validations and state-transition enforcement. It MUST NOT coordinate multi-aggregate
/// workflows or invoke other foundation services (that is the orchestration layer's responsibility, introduced by a later task).</para>
/// <para><b>Lease ownership:</b> <see cref="RenewLeaseAsync"/>, <see cref="CompleteRunAsync"/>, and <see cref="FailRunAsync"/> all require the
/// caller to supply the <c>leaseOwner</c> it believes currently holds the run; a mismatch against the persisted lease owner throws
/// <c>AnalysisRunLeaseConflictException</c> rather than silently overwriting another worker's in-flight run.</para>
/// <para><b>Concurrency:</b> This service does not implement last-write-wins for run mutation — every write is a Cosmos DB conditional replace
/// keyed off the run's last-observed <c>_etag</c>; a stale write is surfaced as a dependency validation failure, never silently discarded or overwritten.</para>
/// </remarks>
public interface IAnalysisRunFoundationService
{
  /// <summary>
  /// Idempotently ensures the durable analysis run store (the <c>analysisRuns</c> Cosmos DB container) exists and is
  /// correctly configured for every environment.
  /// </summary>
  /// <param name="cancellationToken">Cancellation token to abort the operation.</param>
  /// <returns>Asynchronous task.</returns>
  /// <exception cref="OperationCanceledException">Thrown if the operation is cancelled.</exception>
  Task EnsureStoreAsync(CancellationToken cancellationToken);

  /// <summary>
  /// Accepts a new analysis run into the durable queue.
  /// </summary>
  /// <param name="run">The fully formed, queued <see cref="AnalysisRun"/> to persist.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation.</param>
  /// <returns>The persisted run, stamped with its storage concurrency token.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="run"/> is null.</exception>
  /// <exception cref="OperationCanceledException">Thrown if the operation is cancelled.</exception>
  Task<AnalysisRun> CreateRunAsync(
    AnalysisRun run,
    CancellationToken cancellationToken);

  /// <summary>
  /// Claims the oldest available run (queued, or running with an expired lease) for <paramref name="leaseOwner"/>.
  /// </summary>
  /// <param name="leaseOwner">The identifier of the worker claiming a run.</param>
  /// <param name="now">The current instant, used to evaluate lease expiry and to compute the new lease expiry.</param>
  /// <param name="leaseDuration">How long the claimed run's lease remains valid.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation.</param>
  /// <returns>The claimed run, or <c>null</c> when no claimable run is currently available.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="leaseOwner"/> is null, empty, or whitespace.</exception>
  /// <exception cref="OperationCanceledException">Thrown if the operation is cancelled.</exception>
  Task<AnalysisRun?> ClaimNextRunAsync(
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken);

  /// <summary>
  /// Counts the analysis runs currently awaiting a worker, grouped by analysis target type.
  /// </summary>
  /// <param name="now">The current instant, used to evaluate lease expiry.</param>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <returns>The pending run count for every known target type; target types with no pending runs report zero.</returns>
  Task<IReadOnlyDictionary<AnalysisTargetType, long>> CountPendingRunsAsync(
    DateTimeOffset now,
    CancellationToken cancellationToken);

  /// <summary>
  /// Extends the lease of a run currently held by <paramref name="leaseOwner"/>.
  /// </summary>
  /// <param name="runId">The identifier of the run whose lease is being renewed.</param>
  /// <param name="leaseOwner">The identifier of the worker requesting the renewal; must match the run's current lease owner.</param>
  /// <param name="now">The current instant, used to compute the new lease expiry.</param>
  /// <param name="leaseDuration">How long the renewed lease remains valid.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation.</param>
  /// <returns>The updated run.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="leaseOwner"/> is null, empty, or whitespace.</exception>
  /// <exception cref="OperationCanceledException">Thrown if the operation is cancelled.</exception>
  Task<AnalysisRun> RenewLeaseAsync(
    Guid runId,
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken);

  /// <summary>
  /// Marks a run currently held by <paramref name="leaseOwner"/> as completed.
  /// </summary>
  /// <param name="runId">The identifier of the run to complete.</param>
  /// <param name="leaseOwner">The identifier of the worker completing the run; must match the run's current lease owner.</param>
  /// <param name="completedCapabilities">The capabilities that produced a usable result.</param>
  /// <param name="completedAt">The instant the run completed.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation.</param>
  /// <returns>The updated, completed run.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="leaseOwner"/> is null, empty, or whitespace.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="completedCapabilities"/> is null.</exception>
  /// <exception cref="OperationCanceledException">Thrown if the operation is cancelled.</exception>
  Task<AnalysisRun> CompleteRunAsync(
    Guid runId,
    string leaseOwner,
    IReadOnlyCollection<AnalysisCapability> completedCapabilities,
    DateTimeOffset completedAt,
    CancellationToken cancellationToken);

  /// <summary>
  /// Marks a run currently held by <paramref name="leaseOwner"/> as failed.
  /// </summary>
  /// <param name="runId">The identifier of the run to fail.</param>
  /// <param name="leaseOwner">The identifier of the worker failing the run; must match the run's current lease owner.</param>
  /// <param name="failureCode">The stable failure code describing why the run failed.</param>
  /// <param name="failedAt">The instant the run failed.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation.</param>
  /// <returns>The updated, failed run.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="leaseOwner"/> or <paramref name="failureCode"/> is null, empty, or whitespace.</exception>
  /// <exception cref="OperationCanceledException">Thrown if the operation is cancelled.</exception>
  Task<AnalysisRun> FailRunAsync(
    Guid runId,
    string leaseOwner,
    string failureCode,
    DateTimeOffset failedAt,
    CancellationToken cancellationToken);
}
