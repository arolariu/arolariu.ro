namespace arolariu.Backend.Common.Exceptions;

/// <summary>
/// Refinement marker indicating the exception represents a "rate limited"
/// dependency outcome. Mapper emits HTTP 429 Too Many Requests (include Retry-After header).
/// </summary>
public interface IRateLimitedException : IDependencyException
{
}
