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
/// <para>
/// Cancellation is the one exception to that flow: an <see cref="OperationCanceledException"/>
/// is not a fault, so it is answered with 504 (server-side timeout) or 499 (client disconnect)
/// without being recorded as an error on the span.
/// </para>
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
  /// <returns>
  /// <see langword="true"/> once the exception has been mapped and written; or
  /// <see langword="false"/> if the response has already started writing and cannot be
  /// safely replaced with a ProblemDetails payload (the framework's fallback handler
  /// will observe the caller-provided partial response).
  /// </returns>
  public async ValueTask<bool> TryHandleAsync(
    HttpContext httpContext,
    Exception exception,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(httpContext);
    ArgumentNullException.ThrowIfNull(exception);

    if (httpContext.Response.HasStarted)
    {
      // Response has already started writing — we cannot safely emit ProblemDetails now.
      // Let the framework's default handler or the client observe the partial response.
      return false;
    }

    httpContext.Response.Clear();

    // Cancellation is not a fault, so it must not be recorded as one. Per the OpenTelemetry HTTP
    // semantic conventions, an intentionally cancelled request leaves the span status Unset rather
    // than Error — marking it Error would poison error-rate SLOs with ordinary client behaviour.
    // Endpoint handlers classify their own cancellations; this branch is the defense-in-depth path
    // for cancellations thrown outside a handler's try block (model binding, middleware, or an
    // endpoint with no local catch).
    if (exception is OperationCanceledException)
    {
      var isTimeout = RequestCancellation.WasTimeout(httpContext);

      if (isTimeout)
      {
        Activity.Current?.SetStatus(ActivityStatusCode.Error, "Timeout");
        httpContext.Response.StatusCode = StatusCodes.Status504GatewayTimeout;
      }
      else
      {
        Activity.Current?.SetTag("cancellation.reason", "client_disconnect");
        httpContext.Response.StatusCode = StatusCodes.Status499ClientClosedRequest;
      }

      return true;
    }

    // cancellationToken is intentionally not propagated: IResult.ExecuteAsync(HttpContext) has no
    // CancellationToken overload, and HttpContext.RequestAborted already carries the request-abort
    // signal to downstream writers. Kestrel will abort the response write if the client has gone away.
    Activity.Current?.RecordException(exception);
    Activity.Current?.SetStatus(ActivityStatusCode.Error, exception.GetType().Name);

    var result = ExceptionToHttpResultMapper.ToHttpResult(exception, Activity.Current);
    await result.ExecuteAsync(httpContext).ConfigureAwait(false);
    return true;
  }
}
