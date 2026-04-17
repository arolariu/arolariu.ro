namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Refinement marker indicating the exception represents an "authentication failure"
/// dependency-validation outcome. Mapper emits HTTP 401 Unauthorized.
/// </summary>
public interface IUnauthorizedException : IDependencyValidationException
{
}
