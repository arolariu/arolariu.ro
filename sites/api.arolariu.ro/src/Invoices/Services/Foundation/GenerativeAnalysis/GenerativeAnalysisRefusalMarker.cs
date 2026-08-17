namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

/// <summary>
/// Marks and detects generative failures that were caused by a provider refusal or content filter rather than by a
/// contract violation in the model's structured output.
/// </summary>
/// <remarks>
/// <para><b>Why a marker instead of a subclass:</b> <see cref="InvalidStructuredOutputException"/> is sealed and is
/// raised by the generative broker for both "the provider declined to answer" and "the provider answered but the
/// payload did not satisfy the schema". Operators need to alert on those separately &#8212; a spike in refusals is a
/// prompt/policy problem, a spike in schema violations is a model/contract problem &#8212; so the foundation service
/// stamps refusals with a marker that downstream layers read back.</para>
/// <para><b>Confidentiality:</b> The marker is a boolean. Neither the prompt, the response, nor any provider payload
/// is captured.</para>
/// </remarks>
internal static class GenerativeAnalysisRefusalMarker
{
  /// <summary>
  /// The <see cref="Exception.Data"/> key under which the refusal marker is stored.
  /// </summary>
  internal const string RefusalKey = "analysis.refusal";

  /// <summary>
  /// Stamps the refusal marker onto an exception instance.
  /// </summary>
  /// <param name="exception">The exception to mark.</param>
  /// <returns>The same instance, so call sites can mark and throw in one expression.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="exception"/> is <see langword="null"/>.</exception>
  internal static InvalidStructuredOutputException MarkAsRefusal(InvalidStructuredOutputException exception)
  {
    ArgumentNullException.ThrowIfNull(exception);
    exception.Data[RefusalKey] = true;
    return exception;
  }

  /// <summary>
  /// Determines whether an exception was previously marked as a provider refusal.
  /// </summary>
  /// <param name="exception">The exception to inspect.</param>
  /// <returns><see langword="true"/> when the refusal marker is present and set; otherwise <see langword="false"/>.</returns>
  internal static bool IsRefusal(Exception? exception)
    => exception?.Data.Contains(RefusalKey) == true && exception.Data[RefusalKey] is true;
}
