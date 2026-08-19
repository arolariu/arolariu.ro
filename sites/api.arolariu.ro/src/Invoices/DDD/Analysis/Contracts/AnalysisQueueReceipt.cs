namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;

/// <summary>
/// Carries one received analysis message together with the provider receipt required for visibility renewal and deletion.
/// </summary>
public sealed record AnalysisQueueReceipt
{
  /// <summary>
  /// Initializes a new analysis queue receipt.
  /// </summary>
  public AnalysisQueueReceipt(
    AnalysisQueueMessage message,
    string messageId,
    string popReceipt,
    long dequeueCount,
    DateTimeOffset? nextVisibleAt)
  {
    ArgumentNullException.ThrowIfNull(message);
    ArgumentException.ThrowIfNullOrWhiteSpace(messageId);
    ArgumentException.ThrowIfNullOrWhiteSpace(popReceipt);
    ArgumentOutOfRangeException.ThrowIfLessThan(dequeueCount, 1);

    Message = message;
    MessageId = messageId;
    PopReceipt = popReceipt;
    DequeueCount = dequeueCount;
    NextVisibleAt = nextVisibleAt;
  }

  /// <summary>Gets the application analysis message.</summary>
  public AnalysisQueueMessage Message { get; }

  /// <summary>Gets Azure Queue's provider message identifier.</summary>
  public string MessageId { get; }

  /// <summary>Gets the latest pop receipt required for update and delete operations.</summary>
  public string PopReceipt { get; init; }

  /// <summary>Gets the number of times Azure Queue has delivered this message.</summary>
  public long DequeueCount { get; }

  /// <summary>Gets the next time at which the message becomes visible, when supplied by Azure Queue.</summary>
  public DateTimeOffset? NextVisibleAt { get; init; }
}
