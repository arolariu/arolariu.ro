namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Defines the Azure Storage Queue boundary for invoice analysis messages.
/// </summary>
public interface IQueueBroker
{
  /// <summary>Creates the configured queue when it does not already exist.</summary>
  ValueTask CreateQueueIfNotExistsAsync(CancellationToken cancellationToken);

  /// <summary>Enqueues one message and returns the provider message identifier.</summary>
  ValueTask<string> EnqueueMessageAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken);

  /// <summary>Dequeues at most one visible message.</summary>
  ValueTask<AnalysisQueueReceipt?> DequeueMessageAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Updates the invisibility period for one dequeued message.</summary>
  ValueTask<AnalysisQueueReceipt> UpdateMessageVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Deletes one dequeued message.</summary>
  ValueTask DeleteMessageAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);

  /// <summary>Gets the configured queue's existence and approximate message count.</summary>
  ValueTask<QueueStatus> GetQueueStatusAsync(CancellationToken cancellationToken);
}

/// <summary>Represents the current provider-reported queue status.</summary>
/// <param name="Exists">Whether the configured queue exists.</param>
/// <param name="ApproximateMessageCount">The provider's approximate visible and invisible message count.</param>
public readonly record struct QueueStatus(bool Exists, long ApproximateMessageCount);
