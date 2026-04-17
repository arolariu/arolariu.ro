namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Marker interface for dependency-reported validation failures
/// (resource not found, conflict, precondition failed). Implementations map to
/// HTTP 400, 404, 409, or 412 depending on refinement markers applied.
/// </summary>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface IDependencyValidationException
{
}
