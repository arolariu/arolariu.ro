namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.ClassificationService;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Coordinates analysis queue messages and capability execution.
/// </summary>
public sealed partial class AnalysisProcessingService : IAnalysisProcessingService
{
  private static readonly TimeSpan DefaultRenewalInterval = TimeSpan.FromSeconds(30);
  private static readonly TimeSpan DefaultVisibilityTimeout = TimeSpan.FromMinutes(2);

  private readonly IClassificationOrchestrationService classificationOrchestrationService;
  private readonly IAnalysisOrchestrationService analysisOrchestrationService;
  private readonly ILogger<IAnalysisProcessingService> logger;
  private readonly TimeSpan renewalInterval;
  private readonly TimeSpan visibilityTimeout;

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingService"/> class.
  /// </summary>
  public AnalysisProcessingService(
    IClassificationOrchestrationService classificationOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory)
    : this(
      classificationOrchestrationService,
      analysisOrchestrationService,
      loggerFactory,
      DefaultRenewalInterval,
      DefaultVisibilityTimeout)
  {
  }

  internal AnalysisProcessingService(
    IClassificationOrchestrationService classificationOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory,
    TimeSpan renewalInterval,
    TimeSpan visibilityTimeout)
  {
    ArgumentNullException.ThrowIfNull(classificationOrchestrationService);
    ArgumentNullException.ThrowIfNull(analysisOrchestrationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(renewalInterval, TimeSpan.Zero);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);

    this.classificationOrchestrationService = classificationOrchestrationService;
    this.analysisOrchestrationService = analysisOrchestrationService;
    logger = loggerFactory.CreateLogger<IAnalysisProcessingService>();
    this.renewalInterval = renewalInterval;
    this.visibilityTimeout = visibilityTimeout;
  }

  /// <inheritdoc/>
  public async Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisQueueAsync));
      await analysisOrchestrationService.EnsureQueueAsync(cancellationToken).ConfigureAwait(false);
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
      InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(request.Profile, request.Overrides);
      AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
        invoiceId,
        userIdentifier,
        Guid.CreateVersion7(),
        options,
        ResolveTraceId());

      string messageId = await analysisOrchestrationService
        .EnqueueAnalysisAsync(message, cancellationToken)
        .ConfigureAwait(false);

      InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Invoice);
      logger.LogAnalysisMessageQueued(message.CorrelationId, AnalysisTargetType.Invoice);
      return new AnalysisAcceptedResponseDto(messageId, message.TargetType, message.TargetId);
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
      ArgumentNullException.ThrowIfNull(merchant);
      MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(request.Profile, request.Overrides);
      AnalysisQueueMessage message = AnalysisQueueMessage.CreateMerchant(
        merchant.id,
        userIdentifier,
        Guid.CreateVersion7(),
        merchant.ParentCompanyId,
        options,
        ResolveTraceId());

      string messageId = await analysisOrchestrationService
        .EnqueueAnalysisAsync(message, cancellationToken)
        .ConfigureAwait(false);

      InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Merchant);
      logger.LogAnalysisMessageQueued(message.CorrelationId, AnalysisTargetType.Merchant);
      return new AnalysisAcceptedResponseDto(messageId, message.TargetType, message.TargetId);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisQueueReceipt?> ReceiveNextAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReceiveNextAnalysisAsync));
      return await analysisOrchestrationService
        .ReceiveAnalysisAsync(visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  [SuppressMessage(
    "Reliability",
    "CA2025:Ensure tasks using 'IDisposable' instances complete before the instances are disposed",
    Justification = "The visibility-renewal task is always awaited before the cancellation source is disposed.")]
  public async Task<TResult> ExecuteWithVisibilityRenewalAsync<TResult>(
    AnalysisQueueReceipt receipt,
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(receipt);
    ArgumentNullException.ThrowIfNull(operation);

    using var renewalCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    var failure = new VisibilityFailureBox();
    Task renewal = RenewVisibilityUntilCancelledAsync(receipt, failure, renewalCts);
    TResult? result = default;

    try
    {
      result = await operation(renewalCts.Token).ConfigureAwait(false);
    }
    catch (OperationCanceledException) when (failure.Exception is not null)
    {
    }
    finally
    {
      await renewalCts.CancelAsync().ConfigureAwait(false);
      await renewal.ConfigureAwait(false);
    }

    if (failure.Exception is not null)
    {
      throw failure.Exception;
    }

    return result!;
  }

  /// <inheritdoc/>
  public async Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    AnalysisFailureReason? failureReason,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAnalysisAsync));
      await analysisOrchestrationService.DeleteAnalysisAsync(receipt, cancellationToken).ConfigureAwait(false);

      if (failureReason.HasValue)
      {
        logger.LogAnalysisProcessingRunFailed(
          receipt.Message.CorrelationId,
          failureReason.Value);
      }
    }).ConfigureAwait(false);

  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any visibility-renewal failure invalidates message ownership and must cancel the coordinated execution scope.")]
  private async Task RenewVisibilityUntilCancelledAsync(
    AnalysisQueueReceipt receipt,
    VisibilityFailureBox failure,
    CancellationTokenSource renewalCts)
  {
    CancellationToken renewalToken = renewalCts.Token;

    while (!renewalToken.IsCancellationRequested)
    {
      try
      {
        await Task.Delay(renewalInterval, renewalToken).ConfigureAwait(false);
        await analysisOrchestrationService
          .RenewAnalysisVisibilityAsync(receipt, visibilityTimeout, renewalToken)
          .ConfigureAwait(false);
      }
      catch (OperationCanceledException) when (renewalToken.IsCancellationRequested)
      {
        return;
      }
      catch (Exception exception)
      {
        failure.Exception = new AnalysisProcessingDependencyException(exception);
        await renewalCts.CancelAsync().ConfigureAwait(false);
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

  private sealed class VisibilityFailureBox
  {
    internal AnalysisProcessingDependencyException? Exception { get; set; }
  }
}
