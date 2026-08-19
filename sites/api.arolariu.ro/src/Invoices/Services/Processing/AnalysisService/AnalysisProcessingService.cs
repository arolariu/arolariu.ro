namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.ClassificationService;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Coordinates durable analysis-run queueing, claim lifecycle, and immutable patch execution.
/// </summary>
public sealed partial class AnalysisProcessingService : IAnalysisProcessingService
{
  private static readonly TimeSpan DefaultRenewalInterval = TimeSpan.FromSeconds(30);
  private static readonly TimeSpan DefaultLeaseDuration = TimeSpan.FromMinutes(2);
  private static readonly TimeSpan DefaultQueueDepthRefreshInterval = TimeSpan.FromSeconds(30);

  private readonly IClassificationOrchestrationService classificationOrchestrationService;
  private readonly IAnalysisOrchestrationService analysisOrchestrationService;
  private readonly ILogger<IAnalysisProcessingService> logger;
  private readonly TimeSpan renewalInterval;
  private readonly TimeSpan leaseDuration;
  private readonly TimeProvider timeProvider;
  private readonly TimeSpan queueDepthRefreshInterval;
  private static readonly ConditionalWeakTable<TimeProvider, QueueDepthRefreshCoordinator> QueueDepthRefreshCoordinators = new();

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingService"/> class.
  /// </summary>
  /// <param name="classificationOrchestrationService">The classification orchestration service.</param>
  /// <param name="analysisOrchestrationService">The non-classification analysis orchestration service.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  public AnalysisProcessingService(
    IClassificationOrchestrationService classificationOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory)
    : this(
      classificationOrchestrationService,
      analysisOrchestrationService,
      loggerFactory,
      DefaultRenewalInterval,
      DefaultLeaseDuration,
      TimeProvider.System,
      DefaultQueueDepthRefreshInterval)
  {
  }

  internal AnalysisProcessingService(
    IClassificationOrchestrationService classificationOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory,
    TimeSpan renewalInterval,
    TimeSpan leaseDuration)
    : this(
      classificationOrchestrationService,
      analysisOrchestrationService,
      loggerFactory,
      renewalInterval,
      leaseDuration,
      TimeProvider.System,
      DefaultQueueDepthRefreshInterval)
  {
  }

  internal AnalysisProcessingService(
    IClassificationOrchestrationService classificationOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory,
    TimeSpan renewalInterval,
    TimeSpan leaseDuration,
    TimeProvider timeProvider,
    TimeSpan queueDepthRefreshInterval)
  {
    ArgumentNullException.ThrowIfNull(classificationOrchestrationService);
    ArgumentNullException.ThrowIfNull(analysisOrchestrationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentNullException.ThrowIfNull(timeProvider);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(renewalInterval, TimeSpan.Zero);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(leaseDuration, TimeSpan.Zero);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(queueDepthRefreshInterval, TimeSpan.Zero);

    this.classificationOrchestrationService = classificationOrchestrationService;
    this.analysisOrchestrationService = analysisOrchestrationService;
    logger = loggerFactory.CreateLogger<IAnalysisProcessingService>();
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

      InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(request.Profile, request.Overrides);

      AnalysisRun run = await analysisOrchestrationService
        .QueueInvoiceRunAsync(invoiceId, userIdentifier, options, ResolveTraceId(), cancellationToken)
        .ConfigureAwait(false);

      activity?.SetTag("analysis.run_id", run.Id.ToString());
      InvoiceMetrics.RecordAnalysisRunQueued(AnalysisTargetType.Invoice);
      logger.LogAnalysisRunQueued(run.Id, AnalysisTargetType.Invoice);
      return AnalysisAcceptedResponseDto.FromRun(run);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Merchant merchant,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantAnalysisAsync));
      activity?.SetTag("analysis.target_type", nameof(AnalysisTargetType.Merchant));
      activity?.SetTag("analysis.target_id", merchant.id.ToString());

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
  public async Task<AnalysisRun?> ClaimNextRunAsync(string leaseOwner, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ClaimNextRunAsync));
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
        return null;
      }

      activity?.SetTag("analysis.claimed", true);
      activity?.SetTag("analysis.run_id", claimed.Id.ToString());
      activity?.SetTag("analysis.target_type", claimed.TargetType.ToString());
      RecordClaimTelemetry(claimed, claimedAt);
      return claimed;
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task CompleteRunExecutionAsync(
    AnalysisExecutionResult executionResult,
    string leaseOwner,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CompleteRunExecutionAsync));
      ArgumentNullException.ThrowIfNull(executionResult);
      ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);

      if (executionResult.Failed)
      {
        throw new ArgumentException(
          "Failed execution results must be transitioned through FailRunExecutionAsync.",
          nameof(executionResult));
      }

      await analysisOrchestrationService
        .CompleteRunAsync(
          executionResult.ClaimedRun.Id,
          leaseOwner,
          executionResult.CompletedCapabilities,
          timeProvider.GetUtcNow(),
          cancellationToken)
        .ConfigureAwait(false);

      RecordRunOutcome(
        executionResult.ClaimedRun,
        ResolveCompletionOutcome(executionResult.ClaimedRun, executionResult.CompletedCapabilities));
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task FailRunExecutionAsync(
    AnalysisExecutionResult executionResult,
    string leaseOwner,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(FailRunExecutionAsync));
      ArgumentNullException.ThrowIfNull(executionResult);
      ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);

      if (!executionResult.Failed || executionResult.FailureReason is null)
      {
        throw new ArgumentException(
          "Only failed execution results can be transitioned through FailRunExecutionAsync.",
          nameof(executionResult));
      }

      await analysisOrchestrationService
        .FailRunAsync(
          executionResult.ClaimedRun.Id,
          leaseOwner,
          executionResult.FailureCode!,
          timeProvider.GetUtcNow(),
          cancellationToken)
        .ConfigureAwait(false);

      logger.LogAnalysisProcessingRunFailed(executionResult.ClaimedRun.Id, executionResult.FailureReason.Value);
      RecordRunOutcome(executionResult.ClaimedRun, AnalysisOutcome.Failure, executionResult.FailureReason);
    }).ConfigureAwait(false);

  private void RecordClaimTelemetry(AnalysisRun claimed, DateTimeOffset claimedAt)
  {
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
      logger.LogAnalysisQueueDepthRefreshFailed();
    }
  }

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

  private static AnalysisOutcome ResolveCompletionOutcome(
    AnalysisRun run,
    IReadOnlyCollection<AnalysisCapability> completedCapabilities) =>
    run.ResolveOutcome(completedCapabilities);

  /// <inheritdoc/>
  [SuppressMessage(
    "Reliability",
    "CA2025:Ensure tasks using 'IDisposable' instances complete before the instances are disposed",
    Justification = "The heartbeat task is always awaited before the linked cancellation source leaves scope.")]
  public async Task<TResult> ExecuteWithLeaseHeartbeatAsync<TResult>(
    AnalysisRun run,
    string leaseOwner,
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken)
    where TResult : struct
  {
    ArgumentNullException.ThrowIfNull(run);
    ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);
    ArgumentNullException.ThrowIfNull(operation);

    using var heartbeatCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    var heartbeatFailure = new HeartbeatFailureBox();
    Task heartbeat = RenewLeaseUntilCancelledAsync(run, leaseOwner, heartbeatFailure, heartbeatCts);
    TResult? executionResult = null;

    try
    {
      executionResult = await operation(heartbeatCts.Token).ConfigureAwait(false);
    }
    catch (OperationCanceledException) when (heartbeatFailure.Failure is not null)
    {
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

    return executionResult ?? throw new InvalidOperationException("Analysis execution returned no result.");
  }

  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any renewal failure means lease ownership can no longer be proven and execution must be aborted.")]
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
        return;
      }
      catch (Exception exception)
      {
        failureBox.Failure = new AnalysisProcessingDependencyException(exception);
        logger.LogAnalysisProcessingLeaseLost(run.Id);
        InvoiceMetrics.RecordAnalysisLeaseLost(run.TargetType);
        logger.LogAnalysisLeaseLost(run.Id, run.TargetType);
        await heartbeatCts.CancelAsync().ConfigureAwait(false);
        return;
      }
    }
  }

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

  private sealed class HeartbeatFailureBox
  {
    internal AnalysisProcessingDependencyException? Failure { get; set; }
  }

  private sealed class QueueDepthRefreshCoordinator
  {
    internal object Gate { get; } = new();

    internal DateTimeOffset NextRefreshAt { get; set; } = DateTimeOffset.MinValue;
  }
}
