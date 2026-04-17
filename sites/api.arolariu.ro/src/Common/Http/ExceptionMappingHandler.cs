namespace arolariu.Backend.Common.Http;

using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Telemetry.Tracing;

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Global <see cref="IExceptionHandler"/> that routes unhandled exceptions through
/// <see cref="ExceptionToHttpResultMapper"/>, ensuring a consistent RFC 7807 ProblemDetails
/// response even when an exception escapes an endpoint's local try/catch.
/// </summary>
/// <remarks>
/// Endpoints still wrap their handler bodies in try/catch for fast-path telemetry; this
/// handler is belt-and-suspenders for middleware faults and pre-handler throws (model
/// binding, routing, authentication middleware, etc.). On any caught exception it
/// records the exception on the current <see cref="Activity"/>, maps it to a ProblemDetails
/// result, executes the result, and returns <c>true</c> to mark the exception as handled.
/// </remarks>
public sealed class ExceptionMappingHandler : IExceptionHandler
{
  /// <summary>
  /// Translates <paramref name="exception"/> into an RFC 7807 ProblemDetails response
  /// via <see cref="ExceptionToHttpResultMapper.ToHttpResult"/> and writes it to
  /// <paramref name="httpContext"/>.
  /// </summary>
  /// <param name="httpContext">The current request context; must not be <see langword="null"/>.</param>
  /// <param name="exception">The caught exception; must not be <see langword="null"/>.</param>
  /// <param name="cancellationToken">Propagated cancellation token.</param>
  /// <returns><see langword="true"/> once the exception has been mapped and written.</returns>
  public async ValueTask<bool> TryHandleAsync(
    HttpContext httpContext,
    Exception exception,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(httpContext);
    ArgumentNullException.ThrowIfNull(exception);

    Activity.Current?.RecordException(exception);
    Activity.Current?.SetStatus(ActivityStatusCode.Error, exception.GetType().Name);

    var result = ExceptionToHttpResultMapper.ToHttpResult(exception, Activity.Current);
    await result.ExecuteAsync(httpContext).ConfigureAwait(false);
    return true;
  }
}
