namespace arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;

using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;

/// <summary>
/// Provides a thin <see cref="IChatClient"/>-backed implementation of <see cref="IGenerativeAnalysisBroker"/> using native JSON Schema structured output.
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> This broker performs no delimiter parsing, no free-text fallback extraction, and no
/// retry or orchestration logic. Transient-failure retry is the responsibility of the calling foundation-layer service.</para>
/// <para><b>Confidentiality:</b> This broker never logs prompt or response content.</para>
/// </remarks>
public sealed partial class AzureFoundryBroker : IGenerativeAnalysisBroker
{
  private readonly IChatClient chatClient;
  private readonly ILogger<IGenerativeAnalysisBroker> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="AzureFoundryBroker"/> class.
  /// </summary>
  /// <param name="chatClient">The Microsoft.Extensions.AI chat client used to reach the underlying generative AI provider.</param>
  /// <param name="loggerFactory">The factory used to create the provider-neutral Broker logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="chatClient"/> is null.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="loggerFactory"/> is null.</exception>
  public AzureFoundryBroker(IChatClient chatClient, ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(chatClient);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.chatClient = chatClient;
    logger = loggerFactory.CreateLogger<IGenerativeAnalysisBroker>();
  }

  /// <inheritdoc/>
  public async Task<GenerativeAnalysisResponse<T>> GenerateStructuredAsync<T>(
    GenerativeAnalysisRequest request,
    CancellationToken cancellationToken)
    where T : class
  {
    ArgumentNullException.ThrowIfNull(request);
    logger.LogStructuredGenerationStarted();

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

    return new GenerativeAnalysisResponse<T>(result, response.ModelId, MapUsage(response.Usage));
  }
}
