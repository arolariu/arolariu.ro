namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Refinement marker indicating the exception represents a "resource already exists"
/// or conflict dependency-validation outcome. Mapper emits HTTP 409 Conflict.
/// </summary>
public interface IAlreadyExistsException : IDependencyValidationException
{
}
