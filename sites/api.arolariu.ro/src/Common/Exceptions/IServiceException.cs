namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Marker interface for unexpected internal service-layer failures.
/// Implementations map to HTTP 500 Internal Server Error.
/// </summary>
public interface IServiceException
{
}
