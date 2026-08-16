namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;

/// <summary>
/// Deterministic external-boundary double for generative AI broker tests.
/// </summary>
/// <remarks>
/// <para>Each classification pass issues exactly two structured generation calls (search-term generation, then
/// candidate-code selection) per <c>ClassifyBatchAsync</c> invocation, and retry attempts consume from the same
/// sequential script.</para>
/// </remarks>
internal sealed class ScriptedGenerativeAiBroker : IGenerativeAiBroker
{
  private readonly ScriptedGenerativeResponse[] scriptedResponses;
  private readonly List<GenerativeRequest> capturedRequests = [];
  private int invocationIndex = -1;

  /// <summary>
  /// Initializes a new instance of the <see cref="ScriptedGenerativeAiBroker"/> class.
  /// </summary>
  /// <param name="scriptedResponses">The scripted responses returned in call order.</param>
  public ScriptedGenerativeAiBroker(params ScriptedGenerativeResponse[] scriptedResponses)
  {
    ArgumentNullException.ThrowIfNull(scriptedResponses);
    this.scriptedResponses = scriptedResponses;
  }

  /// <summary>
  /// Gets every request captured across all invocations, in call order.
  /// </summary>
  public IReadOnlyList<GenerativeRequest> CapturedRequests => capturedRequests;

  /// <summary>
  /// Gets the total number of invocations observed so far.
  /// </summary>
  public int InvocationCount => invocationIndex + 1;

  /// <inheritdoc/>
  public async Task<GenerativeResponse<T>> GenerateStructuredAsync<T>(
    GenerativeRequest request,
    CancellationToken cancellationToken)
    where T : class
  {
    ArgumentNullException.ThrowIfNull(request);

    lock (capturedRequests)
    {
      capturedRequests.Add(request);
    }

    var responseIndex = Interlocked.Increment(ref invocationIndex);

    if (responseIndex >= scriptedResponses.Length)
    {
      throw new InvalidOperationException("No scripted broker response is available for the requested invocation.");
    }

    ScriptedGenerativeResponse response = scriptedResponses[responseIndex];

    if (response.Delay > TimeSpan.Zero)
    {
      await Task.Delay(response.Delay, cancellationToken).ConfigureAwait(false);
    }

    if (response.Exception is not null)
    {
      throw response.Exception;
    }

    return new GenerativeResponse<T>((T)response.Value!, response.ModelId, response.Usage);
  }

  /// <summary>
  /// Creates a scripted success response.
  /// </summary>
  /// <param name="value">The typed structured value to return.</param>
  /// <param name="modelId">The scripted model identifier.</param>
  /// <param name="delay">The artificial boundary delay.</param>
  /// <returns>The scripted response.</returns>
  public static ScriptedGenerativeResponse Success(object value, string? modelId = null, TimeSpan? delay = null) =>
    new(value, delay ?? TimeSpan.Zero, null, modelId, null);

  /// <summary>
  /// Creates a scripted failure response.
  /// </summary>
  /// <param name="exception">The exception thrown when invoked.</param>
  /// <param name="delay">The artificial boundary delay.</param>
  /// <returns>The scripted response.</returns>
  public static ScriptedGenerativeResponse Failure(Exception exception, TimeSpan? delay = null) =>
    new(null, delay ?? TimeSpan.Zero, exception, null, null);

  /// <summary>
  /// Represents one scripted broker response.
  /// </summary>
  /// <param name="Value">The typed structured value to return.</param>
  /// <param name="Delay">The artificial delay before the response completes.</param>
  /// <param name="Exception">The exception to throw instead of returning a value.</param>
  /// <param name="ModelId">The scripted model identifier.</param>
  /// <param name="Usage">The scripted usage metadata.</param>
  internal readonly record struct ScriptedGenerativeResponse(
    object? Value,
    TimeSpan Delay,
    Exception? Exception,
    string? ModelId,
    GenerativeUsage? Usage);
}
