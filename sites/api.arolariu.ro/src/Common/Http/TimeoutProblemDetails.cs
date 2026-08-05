namespace arolariu.Backend.Common.Http;

using System;
using System.Diagnostics;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

/// <summary>
/// Writes the RFC 7807 ProblemDetails payload used for server-side timeouts.
/// </summary>
/// <remarks>
/// A timeout can surface from two places: the <c>RequestTimeouts</c> middleware, when the
/// cancellation escapes the endpoint handler, and <see cref="ExceptionMappingHandler"/>, when it
/// escapes as an <see cref="OperationCanceledException"/> from outside a handler's try block.
/// Both go through this one writer so a client cannot tell the difference — the "single error
/// contract" only holds if there is literally a single implementation of it.
/// </remarks>
public static class TimeoutProblemDetails
{
  /// <summary>The generic, non-leaking detail message emitted for every timeout response.</summary>
  /// <remarks>
  /// Deliberately does not echo the exception message: 504 is a server-side status and internal
  /// text can contain connection strings or identifiers.
  /// </remarks>
  public const string Detail = "The operation took too long to complete. Please try again later.";

  /// <summary>
  /// Sets HTTP 504 on <paramref name="context"/> and writes the ProblemDetails body.
  /// </summary>
  /// <param name="context">The request being answered; must not be <see langword="null"/>.</param>
  /// <returns>A task that completes once the body has been written.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="context"/> is null.</exception>
  public static async Task WriteAsync(HttpContext context)
  {
    ArgumentNullException.ThrowIfNull(context);

    // Set the status explicitly rather than relying on the caller: the middleware sets it from
    // RequestTimeoutPolicy.TimeoutStatusCode, but the global exception handler does not, and a
    // body claiming 504 alongside some other status would be worse than either alone.
    context.Response.StatusCode = StatusCodes.Status504GatewayTimeout;

    var problem = new ProblemDetails
    {
      Status = StatusCodes.Status504GatewayTimeout,
      Title = "Operation timed out",
      Type = ProblemTypeUris.Timeout,
      Detail = Detail,
    };

    var traceId = Activity.Current?.TraceId.ToString();
    if (!string.IsNullOrEmpty(traceId))
    {
      problem.Extensions["traceId"] = traceId;
    }

    await context.Response
      .WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json")
      .ConfigureAwait(false);
  }
}
