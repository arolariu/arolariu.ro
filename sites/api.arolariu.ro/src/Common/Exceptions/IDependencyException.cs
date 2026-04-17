namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Marker interface for exceptions that represent failures of an external dependency
/// (database, downstream service, queue). Implementations map to HTTP 500 or 503.
/// </summary>
public interface IDependencyException
{
}
