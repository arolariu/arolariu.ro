namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Marker interface for exceptions that represent validation failures
/// attributable to the caller. Implementations map to HTTP 400 Bad Request.
/// </summary>
/// <remarks>
/// Applied to <c>{Layer}ValidationException</c> classes across bounded contexts.
/// The mapper uses this marker to emit RFC 7807 ProblemDetails with status 400.
/// </remarks>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface IValidationException
{
}
