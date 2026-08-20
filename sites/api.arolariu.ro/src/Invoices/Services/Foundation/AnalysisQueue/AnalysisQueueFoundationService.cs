namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

/// <summary>
/// Validates and classifies access to the Azure Storage Queue analysis boundary.
/// </summary>
public sealed partial class AnalysisQueueFoundationService : IAnalysisQueueFoundationService
{
  private readonly IQueueBroker queueBroker;
  private readonly ILogger<IAnalysisQueueFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisQueueFoundationService"/> class.
  /// </summary>
  /// <param name="queueBroker">The broker that owns Azure Storage Queue operations.</param>
  /// <param name="loggerFactory">The factory used to create the queue foundation logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
  public AnalysisQueueFoundationService(
    IQueueBroker queueBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(queueBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.queueBroker = queueBroker;
    logger = loggerFactory.CreateLogger<IAnalysisQueueFoundationService>();
  }

  /// <summary>Provisions the analysis queue and verifies that it is available.</summary>
  /// <param name="cancellationToken">The token used to cancel provisioning or verification.</param>
  /// <returns>A task that completes after queue availability has been verified.</returns>
  /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled.</exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationDependencyValidationException">
  /// Thrown when the broker reports queue state that cannot satisfy the queue contract.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationDependencyException">
  /// Thrown when the queue provider cannot be reached or times out.
  /// </exception>
  public async Task EnsureQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureQueueAsync));
      await queueBroker.CreateQueueIfNotExistsAsync(cancellationToken).ConfigureAwait(false);
      QueueStatus status = await queueBroker.GetQueueStatusAsync(cancellationToken).ConfigureAwait(false);

      if (!status.Exists)
      {
        throw new InvalidOperationException("The analysis queue could not be provisioned.");
      }
    }).ConfigureAwait(false);

  /// <summary>Publishes one provider-neutral analysis request to the durable queue.</summary>
  /// <param name="message">The analysis request to publish.</param>
  /// <param name="cancellationToken">The token used to cancel publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationValidationException">
  /// Thrown when <paramref name="message"/> is <see langword="null"/>.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationDependencyException">
  /// Thrown when the queue provider rejects the operation because of a transport or timeout failure.
  /// </exception>
  public async Task<string> EnqueueAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueAsync));
      ArgumentNullException.ThrowIfNull(message);
      return await queueBroker.EnqueueMessageAsync(message, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Dequeues at most one currently visible analysis request.</summary>
  /// <param name="visibilityTimeout">The positive interval for which a dequeued message is hidden.</param>
  /// <param name="cancellationToken">The token used to cancel the dequeue operation.</param>
  /// <returns>The provider-neutral receipt, or <see langword="null"/> when no message is visible.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationValidationException">
  /// Thrown when <paramref name="visibilityTimeout"/> is not positive.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationDependencyException">
  /// Thrown when the queue provider cannot complete the dequeue operation.
  /// </exception>
  public async Task<AnalysisQueueReceipt?> DequeueAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DequeueAsync));
      ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
      return await queueBroker
        .DequeueMessageAsync(visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Renews visibility ownership for a previously dequeued message.</summary>
  /// <param name="receipt">The receipt containing the current provider message ID and pop receipt.</param>
  /// <param name="visibilityTimeout">The positive interval for which the message remains hidden.</param>
  /// <param name="cancellationToken">The token used to cancel visibility renewal.</param>
  /// <returns>The receipt with the provider's updated pop receipt and next-visible time.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationValidationException">
  /// Thrown when the receipt is <see langword="null"/> or the timeout is not positive.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationDependencyException">
  /// Thrown when the queue provider cannot renew visibility.
  /// </exception>
  public async Task<AnalysisQueueReceipt> RenewVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RenewVisibilityAsync));
      ArgumentNullException.ThrowIfNull(receipt);
      ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
      return await queueBroker
        .UpdateMessageVisibilityAsync(receipt, visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Deletes a completed or terminally failed analysis queue message.</summary>
  /// <param name="receipt">The receipt containing the provider message ID and current pop receipt.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after the provider accepts the deletion.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationValidationException">
  /// Thrown when <paramref name="receipt"/> is <see langword="null"/>.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationDependencyException">
  /// Thrown when the queue provider cannot delete the message.
  /// </exception>
  public async Task DeleteAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAsync));
      ArgumentNullException.ThrowIfNull(receipt);
      await queueBroker.DeleteMessageAsync(receipt, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);
}
