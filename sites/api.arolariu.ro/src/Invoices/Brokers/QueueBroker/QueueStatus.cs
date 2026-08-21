namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

/// <summary>
/// Represents the current provider-reported status of the configured analysis queue.
/// </summary>
/// <remarks>
/// The approximate message count is provider metadata and can change immediately after it is observed.
/// Consumers must not treat it as a transactional count.
/// </remarks>
/// <param name="Exists">Whether the configured queue exists.</param>
/// <param name="ApproximateMessageCount">
/// The provider's approximate visible and invisible message count, or zero when the queue does not exist.
/// </param>
public readonly record struct QueueStatus(bool Exists, long ApproximateMessageCount);
