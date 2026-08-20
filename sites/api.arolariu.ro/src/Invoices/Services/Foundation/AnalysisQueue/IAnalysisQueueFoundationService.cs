namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Defines validated access to the backend-owned analysis queue.
/// </summary>
public interface IAnalysisQueueFoundationService
{
  /// <summary>Enqueues one analysis request and returns Azure Queue's message identifier.</summary>
  /// <param name="message">The validated provider-neutral analysis request to enqueue.</param>
  /// <param name="cancellationToken">The token used to cancel queue publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled.</exception>
  Task<string> EnqueueAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken);

  /// <summary>Dequeues at most one visible analysis request.</summary>
  /// <param name="visibilityTimeout">The period for which a dequeued message remains hidden from other consumers.</param>
  /// <param name="cancellationToken">The token used to cancel the dequeue operation.</param>
  /// <returns>The dequeued receipt, or <see langword="null"/> when no message is visible.</returns>
  /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled.</exception>
  Task<AnalysisQueueReceipt?> DequeueAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Renews one received message's visibility timeout.</summary>
  /// <param name="receipt">The mutable receipt containing the current provider message ID and pop receipt.</param>
  /// <param name="visibilityTimeout">The new period for which the message remains hidden.</param>
  /// <param name="cancellationToken">The token used to cancel visibility renewal.</param>
  /// <returns>The receipt after its pop receipt and next-visible time have been updated.</returns>
  /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled.</exception>
  Task<AnalysisQueueReceipt> RenewVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed message.</summary>
  /// <param name="receipt">The receipt containing the provider message ID and current pop receipt.</param>
  /// <param name="cancellationToken">The token used to cancel message deletion.</param>
  /// <returns>A task that completes after the provider accepts the deletion.</returns>
  /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled.</exception>
  Task DeleteAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);
}
