namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Refinement marker indicating the exception represents a "resource locked"
/// dependency-validation outcome (e.g., soft-deleted). Mapper emits HTTP 423 Locked.
/// </summary>
public interface ILockedException : IDependencyValidationException
{
}
