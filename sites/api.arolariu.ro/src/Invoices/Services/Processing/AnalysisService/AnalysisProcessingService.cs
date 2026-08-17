namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Coordinates the asynchronous analysis pipeline: request-time run acceptance and worker-time run execution.
/// </summary>
/// <remarks>
/// <para><b>Layer role (The Standard):</b> This processing service depends on exactly three orchestration services -
/// invoice, merchant, and analysis (the Florance Pattern). It resolves no foundation service and no broker, and it
/// performs no OCR or generative work of its own.</para>
/// <para><b>Request path:</b> Queue methods validate that the target exists, resolve the effective capability
/// selection once, persist a durable run, and return. No analysis work runs on the request thread.</para>
/// <para><b>Worker path:</b> <see cref="TryExecuteNextRunAsync"/> claims a run, heartbeats its lease while
/// capabilities execute, applies the resulting patch, persists the target, and completes or fails the run.</para>
/// </remarks>
public sealed partial class AnalysisProcessingService : IAnalysisProcessingService
{
  private static readonly TimeSpan DefaultRenewalInterval = TimeSpan.FromSeconds(30);
  private static readonly TimeSpan DefaultLeaseDuration = TimeSpan.FromMinutes(2);
  private static readonly TimeSpan DefaultQueueDepthRefreshInterval = TimeSpan.FromSeconds(30);

  private readonly IInvoiceOrchestrationService invoiceOrchestrationService;
  private readonly IMerchantOrchestrationService merchantOrchestrationService;
  private readonly IAnalysisOrchestrationService analysisOrchestrationService;
  private readonly ILogger<IAnalysisProcessingService> logger;
  private readonly TimeSpan renewalInterval;
  private readonly TimeSpan leaseDuration;
  private readonly TimeProvider timeProvider;
  private readonly TimeSpan queueDepthRefreshInterval;
  // TimeProvider.System is a singleton, so production scopes share one coordinator and cannot stampede a durable
  // count query. Injected providers intentionally receive isolated state; ConditionalWeakTable also ensures a
  // short-lived test/provider cannot retain process-wide sampling state after its owning scope has gone away.
  private static readonly ConditionalWeakTable<TimeProvider, QueueDepthRefreshCoordinator> QueueDepthRefreshCoordinators = new();

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingService"/> class.
  /// </summary>
  /// <param name="invoiceOrchestrationService">The invoice orchestration service used to load and persist invoices.</param>
  /// <param name="merchantOrchestrationService">The merchant orchestration service used to resolve, create, and persist merchants.</param>
  /// <param name="analysisOrchestrationService">The analysis orchestration service owning run lifecycle and capability execution.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when any required dependency is null.</exception>
  public AnalysisProcessingService(
    IInvoiceOrchestrationService invoiceOrchestrationService,
    IMerchantOrchestrationService merchantOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory)
    : this(
      invoiceOrchestrationService,
      merchantOrchestrationService,
      analysisOrchestrationService,
      loggerFactory,
      DefaultRenewalInterval,
      DefaultLeaseDuration,
      TimeProvider.System,
      DefaultQueueDepthRefreshInterval)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingService"/> class with explicit lease timings.
  /// </summary>
  /// <remarks>
  /// <para>This overload exists so tests can compress the heartbeat cadence. Production code MUST use the public
  /// constructor, which pins the published 30-second renewal / two-minute lease contract.</para>
  /// </remarks>
  /// <param name="invoiceOrchestrationService">The invoice orchestration service used to load and persist invoices.</param>
  /// <param name="merchantOrchestrationService">The merchant orchestration service used to resolve, create, and persist merchants.</param>
  /// <param name="analysisOrchestrationService">The analysis orchestration service owning run lifecycle and capability execution.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <param name="renewalInterval">How often an active run's lease is renewed.</param>
  /// <param name="leaseDuration">How long each renewed lease remains valid.</param>
  /// <exception cref="ArgumentNullException">Thrown when any required dependency is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when a supplied interval is not strictly positive.</exception>
  internal AnalysisProcessingService(
    IInvoiceOrchestrationService invoiceOrchestrationService,
    IMerchantOrchestrationService merchantOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory,
    TimeSpan renewalInterval,
    TimeSpan leaseDuration)
    : this(
      invoiceOrchestrationService,
      merchantOrchestrationService,
      analysisOrchestrationService,
      loggerFactory,
      renewalInterval,
      leaseDuration,
      TimeProvider.System,
      DefaultQueueDepthRefreshInterval)
  {
  }

  /// <summary>
  /// Initializes a test-only instance with explicit lease and queue-depth sampling timings.
  /// </summary>
  /// <param name="invoiceOrchestrationService">The invoice orchestration service used to load and persist invoices.</param>
  /// <param name="merchantOrchestrationService">The merchant orchestration service used to resolve, create, and persist merchants.</param>
  /// <param name="analysisOrchestrationService">The analysis orchestration service owning run lifecycle and capability execution.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <param name="renewalInterval">How often an active run's lease is renewed.</param>
  /// <param name="leaseDuration">How long each renewed lease remains valid.</param>
  /// <param name="timeProvider">The UTC time source used for durable run transitions and sampling.</param>
  /// <param name="queueDepthRefreshInterval">The minimum interval between durable queue-depth count queries.</param>
  /// <exception cref="ArgumentNullException">Thrown when any required dependency is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when a supplied interval is not strictly positive.</exception>
  internal AnalysisProcessingService(
    IInvoiceOrchestrationService invoiceOrchestrationService,
    IMerchantOrchestrationService merchantOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory,
    TimeSpan renewalInterval,
    TimeSpan leaseDuration,
    TimeProvider timeProvider,
    TimeSpan queueDepthRefreshInterval)
  {
    ArgumentNullException.ThrowIfNull(invoiceOrchestrationService);
    ArgumentNullException.ThrowIfNull(merchantOrchestrationService);
    ArgumentNullException.ThrowIfNull(analysisOrchestrationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentNullException.ThrowIfNull(timeProvider);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(renewalInterval, TimeSpan.Zero);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(leaseDuration, TimeSpan.Zero);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(queueDepthRefreshInterval, TimeSpan.Zero);

    this.invoiceOrchestrationService = invoiceOrchestrationService;
    this.merchantOrchestrationService = merchantOrchestrationService;
    this.analysisOrchestrationService = analysisOrchestrationService;
    this.logger = loggerFactory.CreateLogger<IAnalysisProcessingService>();
    this.renewalInterval = renewalInterval;
    this.leaseDuration = leaseDuration;
    this.timeProvider = timeProvider;
    this.queueDepthRefreshInterval = queueDepthRefreshInterval;
  }

  /// <inheritdoc/>
  public async Task EnsureAnalysisStoreAsync(CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisStoreAsync));

    await analysisOrchestrationService
      .EnsureRunStoreAsync(cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(QueueInvoiceAnalysisAsync));
    activity?.SetTag("analysis.target_type", nameof(AnalysisTargetType.Invoice));
    activity?.SetTag("analysis.target_id", invoiceId.ToString());

    // The target is validated before anything durable is written so a bad request never leaves a queued run behind.
    Invoice invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceId, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    ArgumentNullException.ThrowIfNull(invoice);

    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(request.Profile, request.Overrides);

    AnalysisRun run = await analysisOrchestrationService
      .QueueInvoiceRunAsync(invoice.id, userIdentifier, options, ResolveTraceId(), cancellationToken)
      .ConfigureAwait(false);

    activity?.SetTag("analysis.run_id", run.Id.ToString());
    InvoiceMetrics.RecordAnalysisRunQueued(AnalysisTargetType.Invoice);
    logger.LogAnalysisRunQueued(run.Id, AnalysisTargetType.Invoice);
    return AnalysisAcceptedResponseDto.FromRun(run);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantAnalysisAsync));
    activity?.SetTag("analysis.target_type", nameof(AnalysisTargetType.Merchant));
    activity?.SetTag("analysis.target_id", merchantId.ToString());

    // Cross-partition read: the caller cannot be trusted to know the merchant's parent company, so it is resolved
    // here and persisted on the run for the later point update.
    Merchant merchant = await merchantOrchestrationService
      .ReadMerchantObject(merchantId, parentCompanyId: null, cancellationToken)
      .ConfigureAwait(false);

    ArgumentNullException.ThrowIfNull(merchant);

    MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(request.Profile, request.Overrides);

    AnalysisRun run = await analysisOrchestrationService
      .QueueMerchantRunAsync(
        merchant.id,
        userIdentifier,
        merchant.ParentCompanyId,
        options,
        ResolveTraceId(),
        cancellationToken)
      .ConfigureAwait(false);

    activity?.SetTag("analysis.run_id", run.Id.ToString());
    InvoiceMetrics.RecordAnalysisRunQueued(AnalysisTargetType.Merchant);
    logger.LogAnalysisRunQueued(run.Id, AnalysisTargetType.Merchant);
    return AnalysisAcceptedResponseDto.FromRun(run);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<bool> TryExecuteNextRunAsync(
    string leaseOwner,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(TryExecuteNextRunAsync));
    ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);
    cancellationToken.ThrowIfCancellationRequested();

    DateTimeOffset claimedAt = timeProvider.GetUtcNow();

    AnalysisRun? claimed = await analysisOrchestrationService
      .ClaimNextRunAsync(leaseOwner, claimedAt, leaseDuration, cancellationToken)
      .ConfigureAwait(false);

    await RefreshQueueDepthIfDueAsync(claimedAt, cancellationToken).ConfigureAwait(false);

    if (claimed is null)
    {
      activity?.SetTag("analysis.claimed", false);
      return false;
    }

    activity?.SetTag("analysis.claimed", true);
    activity?.SetTag("analysis.run_id", claimed.Id.ToString());
    activity?.SetTag("analysis.target_type", claimed.TargetType.ToString());

    RecordClaimTelemetry(claimed, claimedAt);

    await ExecuteWithHeartbeatAsync(claimed, leaseOwner, cancellationToken).ConfigureAwait(false);
    return true;
  }).ConfigureAwait(false);

  /// <summary>
  /// Emits the queue-exit telemetry for a freshly claimed run, including lease recovery when the run had already
  /// been claimed by an earlier worker whose lease expired.
  /// </summary>
  /// <param name="claimed">The run that was just claimed.</param>
  /// <param name="claimedAt">The instant the claim was attempted.</param>
  /// <remarks>
  /// Queue wait is deliberately reported only for a run's <em>first</em> claim. <c>AcceptedAt</c> is fixed at
  /// enqueue time, so reporting it again on a reclaim would attribute the entire failed-attempt lifetime to queue
  /// latency and skew the distribution operators use to size the worker pool. Reclaims are reported through the
  /// dedicated lease-recovery signal instead, which is the quantity that actually describes them.
  /// </remarks>
  private void RecordClaimTelemetry(AnalysisRun claimed, DateTimeOffset claimedAt)
  {
    // AttemptCount is incremented by every claim. A value above one therefore means an earlier worker held - and
    // lost - the lease for this same run, which is precisely the recovery signal operators alert on.
    if (claimed.AttemptCount > 1)
    {
      InvoiceMetrics.RecordAnalysisLeaseRecovered(claimed.TargetType, claimed.AttemptCount);
      logger.LogAnalysisLeaseRecovered(claimed.Id, claimed.TargetType, claimed.AttemptCount);
      return;
    }

    double queueWaitMs = Math.Max((claimedAt - claimed.AcceptedAt).TotalMilliseconds, 0d);

    InvoiceMetrics.RecordAnalysisRunClaimed(claimed.TargetType, queueWaitMs);
    logger.LogAnalysisQueueWaitObserved(claimed.Id, claimed.TargetType, queueWaitMs);
  }

  /// <summary>
  /// Samples durable pending-run depth no more frequently than the configured interval and publishes it to the
  /// observable queue-depth gauge.
  /// </summary>
  /// <param name="now">The instant used to evaluate lease expiry when counting pending runs.</param>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <remarks>
  /// Queue depth is a property of the shared durable store, not of any single process. An additive instrument
  /// would publish one partial sum per worker and drift permanently as soon as a run is enqueued by the API
  /// process and claimed by a worker process, so the depth is measured by counting the store and reported through
  /// an observable gauge whose value is replaced - never accumulated - on each sample.
  /// </remarks>
  private async Task RefreshQueueDepthIfDueAsync(DateTimeOffset now, CancellationToken cancellationToken)
  {
    QueueDepthRefreshCoordinator coordinator = QueueDepthRefreshCoordinators.GetValue(
      timeProvider,
      static _ => new QueueDepthRefreshCoordinator());

    lock (coordinator.Gate)
    {
      if (now < coordinator.NextRefreshAt)
      {
        return;
      }

      // Reserve the next interval before issuing the shared-store query. Concurrent workers in this process can
      // therefore not stampede Cosmos while a count is in flight; a failed count simply leaves the old gauge
      // sample to expire rather than re-exporting it as current.
      coordinator.NextRefreshAt = now.Add(queueDepthRefreshInterval);
    }

    try
    {
      await PublishQueueDepthAsync(now, cancellationToken).ConfigureAwait(false);
    }
    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
    {
      throw;
    }
    catch (AnalysisOrchestrationValidationException)
    {
      logger.LogAnalysisQueueDepthRefreshFailed();
    }
    catch (AnalysisOrchestrationDependencyException)
    {
      logger.LogAnalysisQueueDepthRefreshFailed();
    }
    catch (AnalysisOrchestrationDependencyValidationException)
    {
      logger.LogAnalysisQueueDepthRefreshFailed();
    }
    catch (AnalysisOrchestrationServiceException)
    {
      // Queue depth is best-effort observability. A durable run has already been claimed, so its target work must
      // continue even when the shared-store count is temporarily unavailable.
      logger.LogAnalysisQueueDepthRefreshFailed();
    }
  }

  /// <summary>
  /// Counts the durable queue and publishes a bounded-freshness gauge snapshot for every target type.
  /// </summary>
  /// <param name="now">The instant used to evaluate lease expiry and snapshot freshness.</param>
  /// <param name="cancellationToken">A token used to observe cancellation requests.</param>
  /// <returns>Asynchronous task.</returns>
  private async Task PublishQueueDepthAsync(DateTimeOffset now, CancellationToken cancellationToken)
  {
    IReadOnlyDictionary<AnalysisTargetType, long> pending = await analysisOrchestrationService
      .CountPendingRunsAsync(now, cancellationToken)
      .ConfigureAwait(false);

    foreach (AnalysisTargetType targetType in Enum.GetValues<AnalysisTargetType>())
    {
      long pendingCount = pending.TryGetValue(targetType, out long count) ? count : 0L;
      InvoiceMetrics.PublishAnalysisQueueDepth(targetType, pendingCount, now, queueDepthRefreshInterval);
    }
  }

  /// <summary>
  /// Emits the terminal run telemetry for a claimed run.
  /// </summary>
  /// <param name="run">The claimed run whose execution just reached a terminal state.</param>
  /// <param name="outcome">The terminal outcome.</param>
  /// <param name="failureReason">The bounded failure reason, when the run did not succeed.</param>
  private void RecordRunOutcome(AnalysisRun run, AnalysisOutcome outcome, AnalysisFailureReason? failureReason = null)
  {
    double durationMs = Math.Max((timeProvider.GetUtcNow() - (run.StartedAt ?? run.AcceptedAt)).TotalMilliseconds, 0d);

    InvoiceMetrics.RecordAnalysisRunOutcome(run.TargetType, outcome, durationMs, failureReason);
    logger.LogAnalysisRunOutcomeObserved(run.Id, run.TargetType, outcome, durationMs);

    if (failureReason.HasValue)
    {
      logger.LogAnalysisRunFailureReasonObserved(run.Id, run.TargetType, failureReason.Value);
    }
  }

  /// <summary>
  /// Resolves the terminal outcome of a completed run from how many of its <em>requested</em> capabilities
  /// produced a usable result.
  /// </summary>
  /// <param name="run">The run that just completed.</param>
  /// <param name="completedCapabilities">The capabilities that produced a usable result.</param>
  /// <returns>The terminal outcome for the run.</returns>
  /// <remarks>
  /// The rule lives on <see cref="AnalysisRun"/> because the run owns the effective options that define what was
  /// requested. Counting completions alone cannot distinguish "one of seven capabilities worked" from "the only
  /// requested capability worked", which is the distinction operators page on.
  /// </remarks>
  private static AnalysisOutcome ResolveCompletionOutcome(
    AnalysisRun run,
    IReadOnlyCollection<AnalysisCapability> completedCapabilities) =>
    run.ResolveOutcome(completedCapabilities);

  /// <summary>
  /// Executes a claimed run while a background heartbeat keeps its lease alive.
  /// </summary>
  /// <remarks>
  /// <para>The heartbeat shares a linked cancellation source with target work. If a renewal fails - the canonical
  /// case being another worker having stolen the lease - the source is cancelled immediately, which aborts target
  /// work <em>before</em> the analyzed aggregate is persisted. Once target work has returned, the heartbeat is
  /// cancelled and awaited before a terminal transition begins; an ETag-conditional completion or failure write can
  /// therefore never race a concurrent renewal write.</para>
  /// </remarks>
  /// <param name="run">The claimed run to execute.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  [SuppressMessage(
    "Reliability",
    "CA2025:Ensure tasks using 'IDisposable' instances complete before the instances are disposed",
    Justification = "The heartbeat task is always awaited in the finally block, before the linked source leaves the using scope.")]
  private async Task ExecuteWithHeartbeatAsync(
    AnalysisRun run,
    string leaseOwner,
    CancellationToken cancellationToken)
  {
    using var heartbeatCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    var heartbeatFailure = new HeartbeatFailureBox();
    Task heartbeat = RenewLeaseUntilCancelledAsync(run, leaseOwner, heartbeatFailure, heartbeatCts);
    RunExecutionResult? executionResult = null;

    try
    {
      executionResult = await ExecuteClaimedRunAsync(run, heartbeatCts.Token).ConfigureAwait(false);
    }
    catch (OperationCanceledException) when (heartbeatFailure.Failure is not null)
    {
      // The heartbeat lost the lease. Cleanup below awaits the heartbeat before the underlying lease failure is
      // surfaced, so terminal run mutation is impossible while its renewal write is still in flight.
    }
    finally
    {
      await heartbeatCts.CancelAsync().ConfigureAwait(false);
      await heartbeat.ConfigureAwait(false);
    }

    if (heartbeatFailure.Failure is not null)
    {
      throw heartbeatFailure.Failure;
    }

    ArgumentNullException.ThrowIfNull(executionResult);
    await TransitionRunAsync(run, leaseOwner, executionResult, cancellationToken).ConfigureAwait(false);
  }

  /// <summary>
  /// Renews the run lease on a fixed cadence until the linked heartbeat source is cancelled.
  /// </summary>
  /// <param name="run">The claimed run whose lease is renewed.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="failureBox">The slot that captures the first renewal failure.</param>
  /// <param name="heartbeatCts">The linked source cancelled when renewal is no longer possible.</param>
  /// <returns>Asynchronous task.</returns>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any renewal failure means lease ownership can no longer be proven; the failure is captured, logged, and aborts execution.")]
  private async Task RenewLeaseUntilCancelledAsync(
    AnalysisRun run,
    string leaseOwner,
    HeartbeatFailureBox failureBox,
    CancellationTokenSource heartbeatCts)
  {
    CancellationToken heartbeatToken = heartbeatCts.Token;

    while (!heartbeatToken.IsCancellationRequested)
    {
      try
      {
        await Task.Delay(renewalInterval, heartbeatToken).ConfigureAwait(false);

        await analysisOrchestrationService
          .RenewRunLeaseAsync(run.Id, leaseOwner, timeProvider.GetUtcNow(), leaseDuration, heartbeatToken)
          .ConfigureAwait(false);
      }
      catch (OperationCanceledException) when (heartbeatToken.IsCancellationRequested)
      {
        // Expected: execution finished and cancelled the heartbeat.
        return;
      }
      catch (Exception exception)
      {
        // A renewal failure means this worker can no longer prove lease ownership. Abort execution before the
        // analyzed target is written.
        //
        // This is deliberately NOT a terminal run transition: the run stays Running with an expired lease, so a
        // later worker re-claims it and owns its eventual Completed/Failed transition. Emitting a run outcome
        // here would double-count the run and report a failure for work that ultimately succeeds. The dedicated
        // lease-lost signal is the correct - and only - metric for a recoverable loss.
        failureBox.Failure = new AnalysisProcessingDependencyException(exception);
        logger.LogAnalysisProcessingLeaseLost(run.Id);
        InvoiceMetrics.RecordAnalysisLeaseLost(run.TargetType);
        logger.LogAnalysisLeaseLost(run.Id, run.TargetType);
        await heartbeatCts.CancelAsync().ConfigureAwait(false);
        return;
      }
    }
  }

  /// <summary>
  /// Dispatches a claimed run to its target-specific execution path without transitioning the durable run terminally.
  /// </summary>
  /// <param name="run">The claimed run.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The terminal transition that may be attempted after the heartbeat has stopped.</returns>
  private async Task<RunExecutionResult> ExecuteClaimedRunAsync(
    AnalysisRun run,
    CancellationToken cancellationToken)
  {
    switch (run.TargetType)
    {
      case AnalysisTargetType.Invoice:
        return await ExecuteInvoiceRunAsync(run, cancellationToken).ConfigureAwait(false);

      case AnalysisTargetType.Merchant:
        return await ExecuteMerchantRunAsync(run, cancellationToken).ConfigureAwait(false);

      default:
        return RunExecutionResult.Failed("UNSUPPORTED_TARGET_TYPE", AnalysisFailureReason.UnsupportedTarget);
    }
  }

  /// <summary>
  /// Attempts the terminal durable transition after the heartbeat is stopped and then emits terminal telemetry.
  /// </summary>
  /// <param name="run">The claimed run to transition.</param>
  /// <param name="leaseOwner">The worker that still owns the lease.</param>
  /// <param name="executionResult">The target-work result deciding whether the run completes or fails.</param>
  /// <param name="cancellationToken">The cancellation token that aborts terminal persistence.</param>
  /// <returns>Asynchronous task.</returns>
  private async Task TransitionRunAsync(
    AnalysisRun run,
    string leaseOwner,
    RunExecutionResult executionResult,
    CancellationToken cancellationToken)
  {
    if (executionResult.FailureCode is not null && executionResult.FailureReason.HasValue)
    {
      await FailRunAsync(
        run,
        leaseOwner,
        executionResult.FailureCode,
        executionResult.FailureReason.Value,
        cancellationToken)
        .ConfigureAwait(false);

      if (executionResult.FailureReason == AnalysisFailureReason.TargetPersistence)
      {
        logger.LogAnalysisProcessingTargetPersistenceFailed(run.Id);
      }

      return;
    }

    ArgumentNullException.ThrowIfNull(executionResult.CompletedCapabilities);
    await analysisOrchestrationService
      .CompleteRunAsync(run.Id, leaseOwner, executionResult.CompletedCapabilities, timeProvider.GetUtcNow(), cancellationToken)
      .ConfigureAwait(false);

    RecordRunOutcome(run, ResolveCompletionOutcome(run, executionResult.CompletedCapabilities));
  }

  /// <summary>
  /// Marks a run as failed with a stable failure code and emits the terminal run telemetry.
  /// </summary>
  /// <param name="run">The run to fail.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="failureCode">The stable failure code.</param>
  /// <param name="failureReason">The bounded telemetry failure reason.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  private async Task FailRunAsync(
    AnalysisRun run,
    string leaseOwner,
    string failureCode,
    AnalysisFailureReason failureReason,
    CancellationToken cancellationToken)
  {
    await analysisOrchestrationService
      .FailRunAsync(run.Id, leaseOwner, failureCode, timeProvider.GetUtcNow(), cancellationToken)
      .ConfigureAwait(false);

    logger.LogAnalysisProcessingRunFailed(run.Id, failureReason);
    RecordRunOutcome(run, AnalysisOutcome.Failure, failureReason);
  }

  /// <summary>
  /// Resolves the distributed trace identifier to persist on a queued run.
  /// </summary>
  /// <remarks>
  /// <para>The ambient activity is preferred so the accepted request and the deferred worker execution share one
  /// trace. When no activity is recording - for example under a no-op tracer - a synthetic W3C traceparent is
  /// generated so the run is never persisted with a blank correlation anchor.</para>
  /// </remarks>
  /// <returns>A non-blank W3C trace identifier.</returns>
  private static string ResolveTraceId()
  {
    string? ambient = Activity.Current?.Id;

    if (!string.IsNullOrWhiteSpace(ambient))
    {
      return ambient;
    }

    return string.Format(
      CultureInfo.InvariantCulture,
      "00-{0}-{1}-00",
      ActivityTraceId.CreateRandom().ToHexString(),
      ActivitySpanId.CreateRandom().ToHexString());
  }

  /// <summary>
  /// Carries the first heartbeat failure observed for a run across the heartbeat/execution boundary.
  /// </summary>
  private sealed class HeartbeatFailureBox
  {
    internal AnalysisProcessingDependencyException? Failure { get; set; }
  }

  /// <summary>
  /// Represents the terminal transition determined by successfully completed target work.
  /// </summary>
  private sealed record RunExecutionResult(
    IReadOnlyCollection<AnalysisCapability>? CompletedCapabilities,
    string? FailureCode,
    AnalysisFailureReason? FailureReason)
  {
    internal static RunExecutionResult Completed(IReadOnlyCollection<AnalysisCapability> completedCapabilities) =>
      new(completedCapabilities, FailureCode: null, FailureReason: null);

    internal static RunExecutionResult Failed(
      string failureCode,
      AnalysisFailureReason failureReason) =>
      new(
        CompletedCapabilities: null,
        FailureCode: failureCode,
        FailureReason: failureReason);
  }

  /// <summary>
  /// Shares the next permitted durable queue-depth query time across every processing-service scope in a process.
  /// </summary>
  private sealed class QueueDepthRefreshCoordinator
  {
    internal object Gate { get; } = new();

    internal DateTimeOffset NextRefreshAt { get; set; } = DateTimeOffset.MinValue;
  }
}
