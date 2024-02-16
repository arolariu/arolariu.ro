using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

internal interface IOpenAiAssistant
{
    /// <summary>
    /// Creates a new conversation thread with an OpenAI Assistant.
    /// </summary>
    /// <returns></returns>
    public ValueTask<OpenAiThread> CreateThread();

    /// <summary>
    /// Adds a message to the conversation thread.
    /// </summary>
    /// <param name="threadIdentifier"></param>
    /// <param name="message"></param>
    /// <returns></returns>
    public Task<OpenAiResponseMessage> AddMessageToThread(string threadIdentifier, OpenAiRequestMessage message);

    /// <summary>
    /// Executes the conversation thread (runs the thread).
    /// </summary>
    /// <param name="threadIdentifier"></param>
    /// <returns></returns>
    public Task<OpenAiThreadRun> ExecuteThreadRun(string threadIdentifier);

    /// <summary>
    /// Gets the status of a conversation thread run.
    /// </summary>
    /// <param name="threadIdentifier"></param>
    /// <param name="runIdentifier"></param>
    /// <returns></returns>
    public Task<OpenAiThreadStatus> GetThreadRunStatus(string threadIdentifier, string runIdentifier);

    /// <summary>
    /// Gets the assistant response from the conversation thread.
    /// </summary>
    /// <param name="threadIdentifier"></param>
    /// <returns></returns>
    public Task<string> GetAssistantResponse(string threadIdentifier);
}
