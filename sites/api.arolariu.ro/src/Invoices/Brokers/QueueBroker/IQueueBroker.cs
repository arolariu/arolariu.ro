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
  /// <summary>Ensures the analysis queue exists.</summary>
  ValueTask EnsureAnalysisQueueAsync(CancellationToken cancellationToken);

  /// <summary>Enqueues one analysis request and returns Azure Queue's message identifier.</summary>
  ValueTask<string> EnqueueAnalysisAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken);

  /// <summary>Receives at most one visible analysis request.</summary>
  ValueTask<AnalysisQueueReceipt?> ReceiveAnalysisAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Renews the invisibility period for one received analysis request.</summary>
  ValueTask<AnalysisQueueReceipt> RenewAnalysisVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed analysis request.</summary>
  ValueTask DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);
}
