namespace arolariu.Backend.Common.Exceptions;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Refinement marker indicating the exception represents a "rate limited"
/// dependency outcome. Mapper emits HTTP 429 Too Many Requests and surfaces the
/// <see cref="RetryAfter"/> value in the <c>retryAfterSeconds</c> ProblemDetails extension.
/// </summary>
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface IRateLimitedException : IDependencyException
{
  /// <summary>Gets the recommended retry-after duration surfaced via the ProblemDetails response.</summary>
  /// <remarks>Implementations return <see cref="TimeSpan.Zero"/> when no concrete retry hint is available; the mapper will apply a sensible default.</remarks>
  TimeSpan RetryAfter { get; }
}
