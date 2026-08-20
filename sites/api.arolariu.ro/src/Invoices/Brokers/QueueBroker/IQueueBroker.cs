namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Defines provider transport operations for the backend-owned analysis queue.
/// </summary>
/// <remarks>
/// Implementations serialize queue messages and map provider receipts into application contracts.
/// Validation and analysis workflow policy remain in higher service layers.
/// </remarks>
public interface IQueueBroker
{
  /// <summary>
  /// Publishes one analysis message to the configured queue.
  /// </summary>
  /// <param name="message">The non-null provider-neutral analysis message to serialize and publish.</param>
  /// <param name="cancellationToken">The token that cancels the provider operation.</param>
  /// <returns>The provider-assigned message identifier.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="message"/> is null.</exception>
  /// <exception cref="OperationCanceledException">
  /// Thrown when <paramref name="cancellationToken"/> is cancelled.
  /// </exception>
  /// <exception cref="Azure.RequestFailedException">Thrown when Azure Queue Storage rejects the operation.</exception>
  ValueTask<string> EnqueueMessageAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken);

  /// <summary>
  /// Receives at most one visible message and its provider receipt.
  /// </summary>
  /// <param name="visibilityTimeout">
  /// The positive duration for which a received message is hidden from competing consumers.
  /// </param>
  /// <param name="cancellationToken">The token that cancels the provider operation.</param>
  /// <returns>
  /// A receipt containing either a deserialized message or malformed payload metadata;
  /// otherwise, <see langword="null"/> when no message is visible.
  /// </returns>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="visibilityTimeout"/> is not positive.
  /// </exception>
  /// <exception cref="OperationCanceledException">
  /// Thrown when <paramref name="cancellationToken"/> is cancelled.
  /// </exception>
  /// <exception cref="Azure.RequestFailedException">Thrown when Azure Queue Storage rejects the operation.</exception>
  ValueTask<AnalysisQueueReceipt?> DequeueMessageAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>
  /// Renews the visibility lease for a previously received message.
  /// </summary>
  /// <param name="receipt">
  /// The non-null receipt whose current message identifier and pop receipt authorize the update.
  /// </param>
  /// <param name="visibilityTimeout">The positive renewed invisibility duration.</param>
  /// <param name="cancellationToken">The token that cancels the provider operation.</param>
  /// <returns>
  /// The supplied receipt updated with the provider's latest pop receipt and next-visible timestamp.
  /// </returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="receipt"/> is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="visibilityTimeout"/> is not positive.
  /// </exception>
  /// <exception cref="OperationCanceledException">
  /// Thrown when <paramref name="cancellationToken"/> is cancelled.
  /// </exception>
  /// <exception cref="Azure.RequestFailedException">Thrown when Azure Queue Storage rejects the operation.</exception>
  ValueTask<AnalysisQueueReceipt> UpdateMessageVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>
  /// Permanently removes a previously received message using its current provider receipt.
  /// </summary>
  /// <param name="receipt">
  /// The non-null receipt whose message identifier and pop receipt authorize deletion.
  /// </param>
  /// <param name="cancellationToken">The token that cancels the provider operation.</param>
  /// <returns>A value task that completes when the provider confirms deletion.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="receipt"/> is null.</exception>
  /// <exception cref="OperationCanceledException">
  /// Thrown when <paramref name="cancellationToken"/> is cancelled.
  /// </exception>
  /// <exception cref="Azure.RequestFailedException">Thrown when Azure Queue Storage rejects the operation.</exception>
  ValueTask DeleteMessageAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);

  /// <summary>
  /// Reads the configured queue's existence and approximate message count.
  /// </summary>
  /// <param name="cancellationToken">The token that cancels the provider operation.</param>
  /// <returns>
  /// A status snapshot. A missing queue is represented by <c>Exists</c> set to
  /// <see langword="false"/> and an approximate count of zero.
  /// </returns>
  /// <exception cref="OperationCanceledException">
  /// Thrown when <paramref name="cancellationToken"/> is cancelled.
  /// </exception>
  /// <exception cref="Azure.RequestFailedException">Thrown when Azure Queue Storage rejects the operation.</exception>
  ValueTask<QueueStatus> GetQueueStatusAsync(CancellationToken cancellationToken);
}
