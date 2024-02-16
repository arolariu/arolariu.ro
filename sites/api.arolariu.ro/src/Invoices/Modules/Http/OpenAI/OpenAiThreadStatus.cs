namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI thread status.
/// </summary>
public enum OpenAiThreadStatus
{
    /// <summary>
    /// The thread run was completed.
    /// </summary>
    Completed,

    /// <summary>
    /// The thread run was cancelled.
    /// </summary>
    Cancelled,

    /// <summary>
    /// The thread run was expired (timeout).
    /// </summary>
    Expired,

    /// <summary>
    /// The thread run failed.
    /// </summary>
    Failed,

    /// <summary>
    /// The thread run is in an unknown state.
    /// </summary>
    Unknown
}
