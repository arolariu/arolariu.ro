namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Refinement marker indicating the exception represents an "authorization failure"
/// dependency-validation outcome. Mapper emits HTTP 403 Forbidden.
/// </summary>
public interface IForbiddenException : IDependencyValidationException
{
}
