namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Defines validated access to the backend-owned analysis queue.
/// </summary>
public interface IAnalysisQueueFoundationService
{
  /// <summary>Ensures the analysis queue exists.</summary>
  Task EnsureQueueAsync(CancellationToken cancellationToken);

  /// <summary>Enqueues one analysis request and returns Azure Queue's message identifier.</summary>
  Task<string> EnqueueAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken);

  /// <summary>Receives at most one visible analysis request.</summary>
  Task<AnalysisQueueReceipt?> ReceiveAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Renews one received message's visibility timeout.</summary>
  Task<AnalysisQueueReceipt> RenewVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed message.</summary>
  Task DeleteAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);
}
