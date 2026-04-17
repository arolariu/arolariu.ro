namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Marker interface for exceptions that represent failures of an external dependency
/// (database, downstream service, queue). Implementations map to HTTP 503 (Service Unavailable).
/// </summary>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface IDependencyException
{
}
