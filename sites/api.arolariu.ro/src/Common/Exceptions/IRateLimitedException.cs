namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Refinement marker indicating the exception represents a "rate limited"
/// dependency outcome. Mapper emits HTTP 429 Too Many Requests (a `retryAfterSeconds` extension in the RFC 7807 ProblemDetails body).
/// </summary>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface IRateLimitedException : IDependencyException
{
}
