namespace arolariu.Backend.Common.Http;

using System;
using System.Diagnostics;

using Microsoft.AspNetCore.Http;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Maps a thrown <see cref="Exception"/> into an RFC 7807 <c>ProblemDetails</c>
/// response via <see cref="TypedResults"/>.
/// </summary>
/// <remarks>
/// Bounded-context endpoints must not emit <c>exception.Source</c>, stack traces,
/// or raw exception type names. The mapper is the single source of truth for:
/// <list type="bullet">
/// <item>HTTP status selection based on <see cref="IValidationException"/>,
/// <see cref="IDependencyException"/>, and <see cref="IServiceException"/>
/// and their refinement markers.</item>
/// <item><c>Retry-After</c> header injection for rate-limited responses.</item>
/// <item><c>traceId</c> correlation with the current <see cref="Activity"/>.</item>
/// </list>
/// </remarks>
public interface IExceptionToHttpResultMapper
{
  /// <summary>
  /// Converts <paramref name="exception"/> into an <see cref="IResult"/> representing
  /// a Problem Details response. The method never throws.
  /// </summary>
  /// <param name="exception">The caught exception; must not be <c>null</c>.</param>
  /// <param name="activity">
  /// The current <see cref="Activity"/>; its <c>TraceId</c> populates the
  /// <c>traceId</c> extension on the response. May be <c>null</c>.
  /// </param>
  /// <returns>
  /// An <see cref="IResult"/> (typically <c>TypedResults.Problem</c> or
  /// <c>TypedResults.ValidationProblem</c>) representing the Problem Details response.
  /// </returns>
  IResult ToHttpResult(Exception exception, Activity? activity);
}
