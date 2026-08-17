namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Defines the orchestration-layer capability DAG for the analysis pipeline: durable run queueing and lifecycle
/// passthrough, plus best-effort invoice and merchant capability execution.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> An implementation of this contract depends on exactly the analysis run,
/// document analysis, and generative analysis foundation services (the Florance Pattern). It never calls invoice or
/// merchant orchestration services and never persists analysis outcomes onto the <see cref="Invoice"/> or
/// <see cref="Merchant"/> aggregates directly — attaching results to those aggregates is a later processing-layer
/// responsibility.</para>
/// <para><b>Profile resolution:</b> <see cref="QueueInvoiceRunAsync"/> and <see cref="QueueMerchantRunAsync"/> resolve
/// the effective, published preset for a named <see cref="AnalysisProfile"/> exactly once, at queue time, and persist
/// the resolved effective options on the queued <see cref="AnalysisRun"/>. A worker that later claims the run via
/// <see cref="ClaimNextRunAsync"/> MUST execute the persisted effective options as-is and MUST NOT recompute or
/// reinterpret the profile from current defaults.</para>
/// <para><b>Best-effort execution:</b> <see cref="AnalyzeInvoiceAsync"/> and <see cref="AnalyzeMerchantAsync"/> catch
/// only the typed analysis-foundation capability exceptions per capability and omit the corresponding result section
/// on failure, allowing independent capabilities to still succeed. The durable run-infrastructure methods
/// (<see cref="EnsureRunStoreAsync"/>, <see cref="QueueInvoiceRunAsync"/>, <see cref="QueueMerchantRunAsync"/>,
/// <see cref="ClaimNextRunAsync"/>, <see cref="RenewRunLeaseAsync"/>, <see cref="CompleteRunAsync"/>,
/// <see cref="FailRunAsync"/>) do not apply this best-effort semantics; they propagate orchestration-classified
/// failures unchanged.</para>
/// <para><b>Cancellation:</b> Every method propagates <see cref="OperationCanceledException"/> unchanged.</para>
/// </remarks>
public interface IAnalysisOrchestrationService
{
  /// <summary>
  /// Idempotently ensures the durable analysis run store exists and is correctly configured.
  /// </summary>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  Task EnsureRunStoreAsync(CancellationToken cancellationToken);

  /// <summary>
  /// Resolves the effective invoice analysis options for <paramref name="options"/> and accepts a newly queued
  /// invoice analysis run into the durable queue.
  /// </summary>
  /// <param name="invoiceId">The identifier of the invoice to analyze.</param>
  /// <param name="ownerIdentifier">The identifier of the user who requested the analysis.</param>
  /// <param name="options">The caller-supplied invoice analysis capability selection.</param>
  /// <param name="traceId">The distributed trace identifier to continue across the pipeline boundary.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The persisted run, carrying the resolved effective invoice analysis options.</returns>
  Task<AnalysisRun> QueueInvoiceRunAsync(
    Guid invoiceId,
    Guid ownerIdentifier,
    InvoiceAnalysisOptions options,
    string traceId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Resolves the effective merchant analysis options for <paramref name="options"/> and accepts a newly queued
  /// merchant analysis run into the durable queue.
  /// </summary>
  /// <param name="merchantId">The identifier of the merchant to analyze.</param>
  /// <param name="ownerIdentifier">The identifier of the user who requested the analysis.</param>
  /// <param name="parentCompanyId">
  /// The identifier of the merchant's parent company, which is the merchant's Cosmos partition key. Persisted
  /// verbatim on the queued run as <see cref="AnalysisRun.TargetPartitionIdentifier"/> so a worker-time point
  /// update against the merchant's partition does not need to re-resolve the partition scope.
  /// <see cref="Guid.Empty"/> is a legitimate value: it is the partition of every independent merchant, including
  /// every merchant auto-created during invoice analysis, and is therefore accepted rather than rejected.
  /// </param>
  /// <param name="options">The caller-supplied merchant analysis capability selection.</param>
  /// <param name="traceId">The distributed trace identifier to continue across the pipeline boundary.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The persisted run, carrying the resolved effective merchant analysis options.</returns>
  Task<AnalysisRun> QueueMerchantRunAsync(
    Guid merchantId,
    Guid ownerIdentifier,
    Guid parentCompanyId,
    MerchantAnalysisOptions options,
    string traceId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Claims the oldest available run for <paramref name="leaseOwner"/>.
  /// </summary>
  /// <param name="leaseOwner">The identifier of the worker claiming a run.</param>
  /// <param name="now">The current instant, used to evaluate lease expiry and compute the new lease expiry.</param>
  /// <param name="leaseDuration">How long the claimed run's lease remains valid.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The claimed run, or <see langword="null"/> when no claimable run is currently available.</returns>
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
  /// Executes the invoice analysis capability DAG for <paramref name="run"/>'s persisted effective options against
  /// <paramref name="invoice"/>, catching only typed analysis-foundation capability failures on a best-effort basis.
  /// </summary>
  /// <param name="run">The claimed analysis run carrying the persisted effective invoice analysis options.</param>
  /// <param name="invoice">The invoice to analyze.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The best-effort invoice analysis result.</returns>
  Task<InvoiceAnalysisResult> AnalyzeInvoiceAsync(
    AnalysisRun run,
    Invoice invoice,
    CancellationToken cancellationToken);

  /// <summary>
  /// Executes the merchant analysis capability DAG for <paramref name="run"/>'s persisted effective options against
  /// <paramref name="merchant"/>, catching only typed analysis-foundation capability failures on a best-effort basis.
  /// </summary>
  /// <param name="run">The claimed analysis run carrying the persisted effective merchant analysis options.</param>
  /// <param name="merchant">The merchant to analyze.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The best-effort merchant analysis result.</returns>
  Task<MerchantAnalysisResult> AnalyzeMerchantAsync(
    AnalysisRun run,
    Merchant merchant,
    CancellationToken cancellationToken);

  /// <summary>
  /// Extends the lease of a run currently held by <paramref name="leaseOwner"/>.
  /// </summary>
  /// <param name="runId">The identifier of the run whose lease is being renewed.</param>
  /// <param name="leaseOwner">The identifier of the worker requesting the renewal.</param>
  /// <param name="now">The current instant, used to compute the new lease expiry.</param>
  /// <param name="leaseDuration">How long the renewed lease remains valid.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  Task RenewRunLeaseAsync(
    Guid runId,
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken);

  /// <summary>
  /// Marks a run currently held by <paramref name="leaseOwner"/> as completed.
  /// </summary>
  /// <param name="runId">The identifier of the run to complete.</param>
  /// <param name="leaseOwner">The identifier of the worker completing the run.</param>
  /// <param name="completedCapabilities">The capabilities that produced a usable result.</param>
  /// <param name="completedAt">The instant the run completed.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  Task CompleteRunAsync(
    Guid runId,
    string leaseOwner,
    IReadOnlyCollection<AnalysisCapability> completedCapabilities,
    DateTimeOffset completedAt,
    CancellationToken cancellationToken);

  /// <summary>
  /// Marks a run currently held by <paramref name="leaseOwner"/> as failed.
  /// </summary>
  /// <param name="runId">The identifier of the run to fail.</param>
  /// <param name="leaseOwner">The identifier of the worker failing the run.</param>
  /// <param name="failureCode">The stable failure code describing why the run failed.</param>
  /// <param name="failedAt">The instant the run failed.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  Task FailRunAsync(
    Guid runId,
    string leaseOwner,
    string failureCode,
    DateTimeOffset failedAt,
    CancellationToken cancellationToken);
}
