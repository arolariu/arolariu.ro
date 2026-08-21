namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Coordinates analysis queue lifecycle and non-classification capabilities.
/// </summary>
public sealed partial class AnalysisOrchestrationService : IAnalysisOrchestrationService
{
  private readonly IAnalysisQueueFoundationService analysisQueueFoundationService;
  private readonly IAnalysisFoundationService analysisFoundationService;
  private readonly ILogger<IAnalysisOrchestrationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationService"/> class.
  /// </summary>
  /// <param name="analysisFoundationService">The OCR, generative, and taxonomy capability boundary.</param>
  /// <param name="analysisQueueFoundationService">The durable analysis queue boundary.</param>
  /// <param name="loggerFactory">The factory used to create the orchestration logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
  public AnalysisOrchestrationService(
    IAnalysisFoundationService analysisFoundationService,
    IAnalysisQueueFoundationService analysisQueueFoundationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(analysisQueueFoundationService);
    ArgumentNullException.ThrowIfNull(analysisFoundationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.analysisQueueFoundationService = analysisQueueFoundationService;
    this.analysisFoundationService = analysisFoundationService;
    logger = loggerFactory.CreateLogger<IAnalysisOrchestrationService>();
  }

  /// <inheritdoc/>
  public async Task<string> EnqueueAnalysisAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueAnalysisAsync));
      return await analysisQueueFoundationService.EnqueueAsync(message, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisQueueReceipt?> ReceiveAnalysisAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReceiveAnalysisAsync));
      return await analysisQueueFoundationService
        .DequeueAsync(visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisQueueReceipt> RenewAnalysisVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RenewAnalysisVisibilityAsync));
      return await analysisQueueFoundationService
        .RenewVisibilityAsync(receipt, visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAnalysisAsync));
      await analysisQueueFoundationService.DeleteAsync(receipt, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);
}
