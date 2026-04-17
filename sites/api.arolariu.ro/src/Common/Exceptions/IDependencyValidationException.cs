namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Marker interface for dependency-reported validation failures
/// (resource not found, conflict, precondition failed). Implementations map to
/// HTTP 400, 404, 409, or 412 depending on refinement markers applied.
/// </summary>
public interface IDependencyValidationException
{
}
