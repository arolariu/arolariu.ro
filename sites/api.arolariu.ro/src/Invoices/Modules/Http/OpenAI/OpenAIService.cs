using System;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI typed HTTP Client handler.
/// </summary>
/// <param name="httpClient"></param>
public sealed class OpenAIService(HttpClient httpClient) : IOpenAiAssistant
{
    /// <inheritdoc/>
    public async ValueTask<OpenAiThread> CreateThread()
    {
        var response = await Post(new JsonObject(), "/threads")
                        .ConfigureAwait(false);

        return JsonSerializer.Deserialize<OpenAiThread>(response);
    }

    /// <inheritdoc/>
    public async Task<OpenAiResponseMessage> AddMessageToThread(string threadIdentifier, OpenAiRequestMessage message)
    {
        var response = await Post(new JsonObject
        {
            ["role"] = message.role.ToString(),
            ["content"] = message.content
        }, $"/threads/{threadIdentifier}/messages").ConfigureAwait(false);

        return JsonSerializer.Deserialize<OpenAiResponseMessage>(response);
    }

    /// <inheritdoc/>
    public async Task<OpenAiThreadRun> ExecuteThreadRun(string threadIdentifier)
    {
        var response = await Post(new JsonObject
        {
            ["assistant_id"] = "asst_gJstR4UZO7uBvblcEntOitOM",
            ["tools"] = null,
        }, $"/threads/{threadIdentifier}/runs")
            .ConfigureAwait(false);

        return JsonSerializer.Deserialize<OpenAiThreadRun>(response);
    }

    /// <inheritdoc/>
    public async Task<OpenAiThreadStatus> GetThreadRunStatus(string threadIdentifier, string runIdentifier)
    {
        var response = await Get($"/threads/{threadIdentifier}/runs/{runIdentifier}")
            .ConfigureAwait(false);

        return JsonSerializer.Deserialize<OpenAiThreadStatus>(response);
    }

    /// <inheritdoc/>
    public async Task<string> GetAssistantResponse(string threadIdentifier)
    {
        var response = await Get($"/threads/{threadIdentifier}/messages")
            .ConfigureAwait(false);

        return response;
    }

    /// <summary>
    /// Perform a GET request to the OpenAI API.
    /// </summary>
    /// <param name="path"></param>
    /// <returns></returns>
    private async ValueTask<string> Get(string path = "")
    {
        httpClient.BaseAddress = new Uri(httpClient.BaseAddress!, path);
        using var response = await httpClient.GetAsync(httpClient.BaseAddress)
            .ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync()
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Perform a POST request to the OpenAI API.
    /// </summary>
    /// <param name="content"></param>
    /// <param name="path"></param>
    /// <returns></returns>
    private async ValueTask<string> Post(JsonObject content, string path = "")
    {
        ArgumentNullException.ThrowIfNull(content);
        httpClient.BaseAddress = new Uri(httpClient.BaseAddress!, path);
        using var json = new StringContent(content.ToString());
        using var response =
            await httpClient.PostAsync(httpClient.BaseAddress, json)
                .ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync()
            .ConfigureAwait(false);
    }
}
