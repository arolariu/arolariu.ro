namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;

/// <summary>
/// Deterministic external-boundary double for document intelligence broker tests.
/// </summary>
internal sealed class ScriptedDocumentIntelligenceBroker : IDocumentIntelligenceBroker
{
  private readonly ScriptedDocumentResponse[] scriptedResponses;
  private int invocationIndex = -1;
  private int activeRequestCount;

  /// <summary>
  /// Initializes a new instance of the <see cref="ScriptedDocumentIntelligenceBroker"/> class.
  /// </summary>
  /// <param name="scriptedDocuments">The scripted documents returned in call order.</param>
  public ScriptedDocumentIntelligenceBroker(params DocumentIntelligenceRecord[] scriptedDocuments)
    : this(CreateResponses(scriptedDocuments))
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ScriptedDocumentIntelligenceBroker"/> class.
  /// </summary>
  /// <param name="scriptedResponses">The scripted responses returned in call order.</param>
  public ScriptedDocumentIntelligenceBroker(params ScriptedDocumentResponse[] scriptedResponses)
  {
    ArgumentNullException.ThrowIfNull(scriptedResponses);
    this.scriptedResponses = scriptedResponses;
  }

  /// <summary>
  /// Gets the maximum number of concurrent broker calls observed during the test run.
  /// </summary>
  public int MaxConcurrentRequests { get; private set; }

  /// <inheritdoc/>
  public async ValueTask<DocumentIntelligenceRecord> AnalyzeReceiptAsync(
    Uri scanLocation,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scanLocation);

    var responseIndex = Interlocked.Increment(ref invocationIndex);

    if (responseIndex >= scriptedResponses.Length)
    {
      throw new InvalidOperationException("No scripted broker response is available for the requested invocation.");
    }

    int concurrentCount = Interlocked.Increment(ref activeRequestCount);

    try
    {
      MaxConcurrentRequests = Math.Max(MaxConcurrentRequests, concurrentCount);

      ScriptedDocumentResponse response = scriptedResponses[responseIndex];

      if (response.Delay > TimeSpan.Zero)
      {
        await Task.Delay(response.Delay, cancellationToken).ConfigureAwait(false);
      }

      if (response.Exception is not null)
      {
        throw response.Exception;
      }

      return response.Document!;
    }
    finally
    {
      Interlocked.Decrement(ref activeRequestCount);
    }
  }

  /// <summary>
  /// Creates a scripted success response.
  /// </summary>
  /// <param name="document">The provider-neutral document to return.</param>
  /// <param name="delay">The artificial boundary delay.</param>
  /// <returns>The scripted response.</returns>
  public static ScriptedDocumentResponse Success(
    DocumentIntelligenceRecord document,
    TimeSpan? delay = null) =>
    new(document, delay ?? TimeSpan.Zero, null);

  /// <summary>
  /// Creates a scripted failure response.
  /// </summary>
  /// <param name="exception">The exception thrown when invoked.</param>
  /// <param name="delay">The artificial boundary delay.</param>
  /// <returns>The scripted response.</returns>
  public static ScriptedDocumentResponse Failure(Exception exception, TimeSpan? delay = null) =>
    new(null, delay ?? TimeSpan.Zero, exception);

  private static ScriptedDocumentResponse[] CreateResponses(
    DocumentIntelligenceRecord[] scriptedDocuments)
  {
    ArgumentNullException.ThrowIfNull(scriptedDocuments);

    var responses = new ScriptedDocumentResponse[scriptedDocuments.Length];

    for (int index = 0; index < scriptedDocuments.Length; index++)
    {
      responses[index] = Success(scriptedDocuments[index]);
    }

    return responses;
  }

  /// <summary>
  /// Represents one scripted broker response.
  /// </summary>
  /// <param name="Document">The provider-neutral document to return.</param>
  /// <param name="Delay">The artificial delay before the response completes.</param>
  /// <param name="Exception">The exception to throw instead of returning a document.</param>
  internal readonly record struct ScriptedDocumentResponse(
    DocumentIntelligenceRecord? Document,
    TimeSpan Delay,
    Exception? Exception);
}
