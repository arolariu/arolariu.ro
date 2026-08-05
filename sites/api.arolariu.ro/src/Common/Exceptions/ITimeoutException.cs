namespace arolariu.Backend.Common.Exceptions;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Marker indicating the exception represents a server-side operation timeout —
/// the server gave up waiting on a downstream dependency. Mapper emits HTTP 504 Gateway Timeout.
/// </summary>
/// <remarks>
/// Deliberately does NOT inherit <see cref="IDependencyException"/>. The mapper's status switch is
/// first-match; inheriting would let the <c>IDependencyException =&gt; 503</c> arm claim it first.
/// </remarks>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces used for exception classification and HTTP status mapping")]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "Exception suffix is intentional for exception marker interfaces")]
public interface ITimeoutException
{
}
