namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Refinement marker indicating the exception represents a "resource not found"
/// dependency-validation outcome. Mapper emits HTTP 404 Not Found.
/// </summary>
public interface INotFoundException : IDependencyValidationException
{
}
