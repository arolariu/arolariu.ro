namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Refinement marker indicating the exception represents a "resource already exists"
/// or conflict dependency-validation outcome. Mapper emits HTTP 409 Conflict.
/// </summary>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface IAlreadyExistsException : IDependencyValidationException
{
}
