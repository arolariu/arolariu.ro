namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

/// <summary>
/// Carries one received analysis message together with the provider receipt required for visibility renewal and deletion.
/// </summary>
public sealed class AnalysisQueueReceipt
{
  /// <summary>
  /// Initializes a new analysis queue receipt.
  /// </summary>
  public AnalysisQueueReceipt(
    QueueAnalysisMessage message,
    string messageId,
    string popReceipt,
    long dequeueCount,
    DateTimeOffset? nextVisibleAt)
    : this(message, rawPayload: null, messageId, popReceipt, dequeueCount, nextVisibleAt)
  {
  }

  private AnalysisQueueReceipt(
    QueueAnalysisMessage? message,
    string? rawPayload,
    string messageId,
    string popReceipt,
    long dequeueCount,
    DateTimeOffset? nextVisibleAt)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(messageId);
    ArgumentException.ThrowIfNullOrWhiteSpace(popReceipt);
    ArgumentOutOfRangeException.ThrowIfLessThan(dequeueCount, 1);

    Message = message;
    RawPayload = rawPayload;
    MessageId = messageId;
    PopReceipt = popReceipt;
    DequeueCount = dequeueCount;
    NextVisibleAt = nextVisibleAt;
  }

  /// <summary>Gets the application analysis message, or null when the provider payload is malformed.</summary>
  public QueueAnalysisMessage? Message { get; }

  /// <summary>Gets the malformed raw provider payload, or null for a valid application message.</summary>
  public string? RawPayload { get; }

  /// <summary>Gets a value indicating whether the provider payload could not be parsed.</summary>
  public bool IsMalformed => Message is null;

  /// <summary>Gets Azure Queue's provider message identifier.</summary>
  public string MessageId { get; }

  /// <summary>Gets the latest pop receipt required for update and delete operations.</summary>
  public string PopReceipt { get; private set; }

  /// <summary>Gets the number of times Azure Queue has delivered this message.</summary>
  public long DequeueCount { get; }

  /// <summary>Gets the next time at which the message becomes visible, when supplied by Azure Queue.</summary>
  public DateTimeOffset? NextVisibleAt { get; private set; }

  /// <summary>Creates a receipt for a malformed provider payload while retaining retry and deletion metadata.</summary>
  /// <param name="rawPayload">The unparsed provider payload. Its contents must never be logged.</param>
  /// <param name="messageId">Azure Queue's message identifier.</param>
  /// <param name="popReceipt">The current pop receipt required for renewal or deletion.</param>
  /// <param name="dequeueCount">The number of times Azure Queue has delivered the payload.</param>
  /// <param name="nextVisibleAt">The next visibility timestamp supplied by Azure Queue, when available.</param>
  /// <returns>A malformed receipt that can participate in bounded retry and terminal deletion.</returns>
  public static AnalysisQueueReceipt CreateMalformed(
    string rawPayload,
    string messageId,
    string popReceipt,
    long dequeueCount,
    DateTimeOffset? nextVisibleAt)
  {
    ArgumentNullException.ThrowIfNull(rawPayload);
    return new AnalysisQueueReceipt(
      message: null,
      rawPayload,
      messageId,
      popReceipt,
      dequeueCount,
      nextVisibleAt);
  }

  internal void UpdateVisibility(string popReceipt, DateTimeOffset? nextVisibleAt)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(popReceipt);
    PopReceipt = popReceipt;
    NextVisibleAt = nextVisibleAt;
  }
}
