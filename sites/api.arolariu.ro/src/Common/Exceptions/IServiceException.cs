namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Marker interface for unexpected internal service-layer failures.
/// Implementations map to HTTP 500 Internal Server Error.
/// </summary>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface IServiceException
{
}
