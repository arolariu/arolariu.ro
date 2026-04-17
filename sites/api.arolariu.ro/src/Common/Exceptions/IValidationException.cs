namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Marker interface for exceptions that represent validation failures
/// attributable to the caller. Implementations map to HTTP 400 Bad Request.
/// </summary>
/// <remarks>
/// Applied to <c>{Layer}ValidationException</c> classes across bounded contexts.
/// The mapper uses this marker to emit RFC 7807 ProblemDetails with status 400.
/// </remarks>
public interface IValidationException
{
}
