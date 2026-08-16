namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Diagnostics;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
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

  private readonly IInvoiceOrchestrationService invoiceOrchestrationService;
  private readonly IMerchantOrchestrationService merchantOrchestrationService;
  private readonly IAnalysisOrchestrationService analysisOrchestrationService;
  private readonly ILogger<IAnalysisProcessingService> logger;
  private readonly TimeSpan renewalInterval;
  private readonly TimeSpan leaseDuration;

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
      DefaultLeaseDuration)
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
  {
    ArgumentNullException.ThrowIfNull(invoiceOrchestrationService);
    ArgumentNullException.ThrowIfNull(merchantOrchestrationService);
    ArgumentNullException.ThrowIfNull(analysisOrchestrationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(renewalInterval, TimeSpan.Zero);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(leaseDuration, TimeSpan.Zero);

    this.invoiceOrchestrationService = invoiceOrchestrationService;
    this.merchantOrchestrationService = merchantOrchestrationService;
    this.analysisOrchestrationService = analysisOrchestrationService;
    this.logger = loggerFactory.CreateLogger<IAnalysisProcessingService>();
    this.renewalInterval = renewalInterval;
    this.leaseDuration = leaseDuration;
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

    AnalysisRun? claimed = await analysisOrchestrationService
      .ClaimNextRunAsync(leaseOwner, DateTimeOffset.UtcNow, leaseDuration, cancellationToken)
      .ConfigureAwait(false);

    if (claimed is null)
    {
      activity?.SetTag("analysis.claimed", false);
      return false;
    }

    activity?.SetTag("analysis.claimed", true);
    activity?.SetTag("analysis.run_id", claimed.Id.ToString());
    activity?.SetTag("analysis.target_type", claimed.TargetType.ToString());

    await ExecuteWithHeartbeatAsync(claimed, leaseOwner, cancellationToken).ConfigureAwait(false);
    return true;
  }).ConfigureAwait(false);

  /// <summary>
  /// Executes a claimed run while a background heartbeat keeps its lease alive.
  /// </summary>
  /// <remarks>
  /// <para>The heartbeat shares a linked cancellation source with the execution. If a renewal fails - the canonical
  /// case being another worker having stolen the lease - the source is cancelled immediately, which aborts execution
  /// <em>before</em> the analyzed target is persisted. That ordering is what prevents two workers from writing the
  /// same target concurrently.</para>
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
    Task heartbeat = RenewLeaseUntilCancelledAsync(run.Id, leaseOwner, heartbeatFailure, heartbeatCts);

    try
    {
      await ExecuteClaimedRunAsync(run, leaseOwner, heartbeatCts.Token).ConfigureAwait(false);
    }
    catch (OperationCanceledException) when (heartbeatFailure.Failure is not null)
    {
      // The heartbeat lost the lease. Surface the underlying lease failure rather than a generic cancellation.
      throw heartbeatFailure.Failure;
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
  }

  /// <summary>
  /// Renews the run lease on a fixed cadence until the linked heartbeat source is cancelled.
  /// </summary>
  /// <param name="runId">The run whose lease is renewed.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="failureBox">The slot that captures the first renewal failure.</param>
  /// <param name="heartbeatCts">The linked source cancelled when renewal is no longer possible.</param>
  /// <returns>Asynchronous task.</returns>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any renewal failure means lease ownership can no longer be proven; the failure is captured, logged, and aborts execution.")]
  private async Task RenewLeaseUntilCancelledAsync(
    Guid runId,
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
          .RenewRunLeaseAsync(runId, leaseOwner, DateTimeOffset.UtcNow, leaseDuration, heartbeatToken)
          .ConfigureAwait(false);
      }
      catch (OperationCanceledException)
      {
        // Expected: execution finished and cancelled the heartbeat.
        return;
      }
      catch (Exception exception)
      {
        // A renewal failure means this worker can no longer prove lease ownership. Abort execution before the
        // analyzed target is written.
        failureBox.Failure = new AnalysisProcessingDependencyException(exception);
        logger.LogAnalysisProcessingLeaseLost(runId.ToString(), exception.Message);
        await heartbeatCts.CancelAsync().ConfigureAwait(false);
        return;
      }
    }
  }

  /// <summary>
  /// Dispatches a claimed run to its target-specific execution path.
  /// </summary>
  /// <param name="run">The claimed run.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  private async Task ExecuteClaimedRunAsync(
    AnalysisRun run,
    string leaseOwner,
    CancellationToken cancellationToken)
  {
    switch (run.TargetType)
    {
      case AnalysisTargetType.Invoice:
        await ExecuteInvoiceRunAsync(run, leaseOwner, cancellationToken).ConfigureAwait(false);
        break;

      case AnalysisTargetType.Merchant:
        await ExecuteMerchantRunAsync(run, leaseOwner, cancellationToken).ConfigureAwait(false);
        break;

      default:
        await FailRunAsync(run, leaseOwner, "UNSUPPORTED_TARGET_TYPE", cancellationToken).ConfigureAwait(false);
        break;
    }
  }

  /// <summary>
  /// Marks a run as failed with a stable failure code.
  /// </summary>
  /// <param name="run">The run to fail.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="failureCode">The stable failure code.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  private async Task FailRunAsync(
    AnalysisRun run,
    string leaseOwner,
    string failureCode,
    CancellationToken cancellationToken)
  {
    logger.LogAnalysisProcessingRunFailed(run.Id.ToString(), failureCode);

    await analysisOrchestrationService
      .FailRunAsync(run.Id, leaseOwner, failureCode, DateTimeOffset.UtcNow, cancellationToken)
      .ConfigureAwait(false);
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
}
