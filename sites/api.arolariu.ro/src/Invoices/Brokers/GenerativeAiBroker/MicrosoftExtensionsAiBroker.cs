namespace arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;

using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using Microsoft.Extensions.AI;

/// <summary>
/// Provides a thin <see cref="IChatClient"/>-backed implementation of <see cref="IGenerativeAiBroker"/> using native JSON Schema structured output.
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> This broker performs no delimiter parsing, no free-text fallback extraction, and no
/// retry or orchestration logic. Transient-failure retry is the responsibility of the calling foundation-layer service.</para>
/// <para><b>Confidentiality:</b> This broker never logs prompt or response content.</para>
/// </remarks>
public sealed class MicrosoftExtensionsAiBroker : IGenerativeAiBroker
{
  private readonly IChatClient chatClient;

  /// <summary>
  /// Initializes a new instance of the <see cref="MicrosoftExtensionsAiBroker"/> class.
  /// </summary>
  /// <param name="chatClient">The Microsoft.Extensions.AI chat client used to reach the underlying generative AI provider.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="chatClient"/> is null.</exception>
  public MicrosoftExtensionsAiBroker(IChatClient chatClient)
  {
    ArgumentNullException.ThrowIfNull(chatClient);
    this.chatClient = chatClient;
  }

  /// <inheritdoc/>
  public async Task<GenerativeResponse<T>> GenerateStructuredAsync<T>(
    GenerativeRequest request,
    CancellationToken cancellationToken)
    where T : class
  {
    ArgumentNullException.ThrowIfNull(request);

    var messages = new List<ChatMessage>
    {
      new(ChatRole.System, request.SystemPrompt),
      new(ChatRole.User, JsonSerializer.Serialize(new { user_payload = request.UserPayload })),
    };

    ChatResponse<T> response = await chatClient
      .GetResponseAsync<T>(messages, options: null, useJsonSchemaResponseFormat: true, cancellationToken)
      .ConfigureAwait(false);

    if (!response.TryGetResult(out T? result) || result is null)
    {
      throw new InvalidStructuredOutputException(
        "The generative AI provider did not return a typed structured result satisfying the requested contract.");
    }

    return new GenerativeResponse<T>(result, response.ModelId, MapUsage(response.Usage));
  }

  private static GenerativeUsage? MapUsage(UsageDetails? usage) =>
    usage is null
      ? null
      : new GenerativeUsage(usage.InputTokenCount, usage.OutputTokenCount, usage.TotalTokenCount);
}
