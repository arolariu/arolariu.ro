namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI message role.
/// </summary>
public enum OpenAiThreadMessageRole
{
    /// <summary>
    /// The user role.
    /// </summary>
    User,

    /// <summary>
    /// The system role.
    /// </summary>
    System,

    /// <summary>
    /// The assistant role.
    /// </summary>
    Assistant
}