namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Refinement marker indicating the exception represents a "resource locked"
/// dependency-validation outcome (e.g., soft-deleted). Mapper emits HTTP 423 Locked.
/// </summary>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface ILockedException : IDependencyValidationException
{
}
