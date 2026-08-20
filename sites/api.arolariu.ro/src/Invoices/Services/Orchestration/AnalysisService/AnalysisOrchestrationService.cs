namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

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

  /// <summary>Ensures the backend-owned analysis queue is available.</summary>
  /// <param name="cancellationToken">The token used to cancel queue provisioning.</param>
  /// <returns>A task that completes after availability is verified.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when the queue foundation reports a provider failure.
  /// </exception>
  public async Task EnsureQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureQueueAsync));
      await analysisQueueFoundationService.EnsureQueueAsync(cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Publishes one durable analysis request through the queue foundation.</summary>
  /// <param name="message">The provider-neutral analysis request to enqueue.</param>
  /// <param name="cancellationToken">The token used to cancel publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the queue foundation rejects the message input.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when the queue provider cannot publish the message.
  /// </exception>
  public async Task<string> EnqueueAnalysisAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueAnalysisAsync));
      return await analysisQueueFoundationService.EnqueueAsync(message, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Receives at most one visible analysis message from the queue foundation.</summary>
  /// <param name="visibilityTimeout">The positive interval for which a dequeued message is hidden.</param>
  /// <param name="cancellationToken">The token used to cancel dequeue.</param>
  /// <returns>The receipt, or <see langword="null"/> when no message is visible.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the visibility timeout is invalid.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when the queue provider cannot complete the dequeue.
  /// </exception>
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

  /// <summary>Renews visibility ownership for a dequeued analysis message.</summary>
  /// <param name="receipt">The receipt containing the current provider message ID and pop receipt.</param>
  /// <param name="visibilityTimeout">The positive replacement visibility interval.</param>
  /// <param name="cancellationToken">The token used to cancel renewal.</param>
  /// <returns>The receipt containing updated provider state.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the receipt or timeout is invalid.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when the provider cannot renew visibility.
  /// </exception>
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

  /// <summary>Deletes a completed or terminally failed analysis message.</summary>
  /// <param name="receipt">The receipt containing the provider message ID and current pop receipt.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the receipt is invalid.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when the provider cannot delete the message.
  /// </exception>
  public async Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAnalysisAsync));
      await analysisQueueFoundationService.DeleteAsync(receipt, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);
}
