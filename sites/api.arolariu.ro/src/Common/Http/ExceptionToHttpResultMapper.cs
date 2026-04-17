namespace arolariu.Backend.Common.Http;

using System;
using System.Collections.Generic;
using System.Diagnostics;

using arolariu.Backend.Common.Exceptions;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

/// <inheritdoc />
public sealed class ExceptionToHttpResultMapper : IExceptionToHttpResultMapper
{
  /// <inheritdoc />
  public IResult ToHttpResult(Exception exception, Activity? activity)
  {
    ArgumentNullException.ThrowIfNull(exception);

    var root = FindClassifiableException(exception);
    var (status, title, type) = SelectStatus(root);

    var extensions = new Dictionary<string, object?>(StringComparer.Ordinal);
    var traceId = activity?.TraceId.ToString() ?? Activity.Current?.TraceId.ToString();
    if (!string.IsNullOrEmpty(traceId))
    {
      extensions["traceId"] = traceId;
    }

    // Surface retry hint for rate-limited responses.
    if (root is IRateLimitedException)
    {
      var retryAfter = TryGetRetryAfter(root);
      extensions["retryAfterSeconds"] = (int)Math.Ceiling(retryAfter.TotalSeconds);
    }

    return TypedResults.Problem(new ProblemDetails
    {
      Status = status,
      Title = title,
      Type = type,
      Detail = BuildSafeDetail(root),
      Extensions = extensions,
    });
  }

  private static Exception FindClassifiableException(Exception ex)
  {
    // Walk the chain preferring the innermost classifiable exception — refinement
    // markers live on inner types (e.g., InvoiceNotFoundException wrapped by
    // InvoiceFoundationDependencyValidationException).
    Exception? current = ex;
    Exception deepest = ex;
    while (current is not null)
    {
      if (IsClassifiable(current)) { deepest = current; }
      current = current.InnerException;
    }
    return deepest;
  }

  private static bool IsClassifiable(Exception ex) =>
    ex is IValidationException
      or IDependencyValidationException
      or IDependencyException
      or IServiceException
      or INotFoundException
      or IAlreadyExistsException
      or ILockedException
      or IRateLimitedException
      or IUnauthorizedException
      or IForbiddenException;

  private static (int Status, string Title, string Type) SelectStatus(Exception ex) => ex switch
  {
    IUnauthorizedException         => (401, "Unauthorized",          ProblemTypeUris.Unauthorized),
    IForbiddenException            => (403, "Forbidden",             ProblemTypeUris.Forbidden),
    INotFoundException             => (404, "Resource not found",    ProblemTypeUris.NotFound),
    IAlreadyExistsException        => (409, "Resource conflict",     ProblemTypeUris.Conflict),
    ILockedException               => (423, "Resource locked",       ProblemTypeUris.Locked),
    IRateLimitedException          => (429, "Too many requests",     ProblemTypeUris.RateLimited),
    IValidationException           => (400, "Validation failed",     ProblemTypeUris.Validation),
    IDependencyValidationException => (400, "Dependency validation", ProblemTypeUris.Validation),
    IDependencyException           => (503, "Service unavailable",   ProblemTypeUris.ServiceUnavailable),
    IServiceException              => (500, "Internal server error", ProblemTypeUris.InternalServerError),
    _                              => (500, "Internal server error", ProblemTypeUris.InternalServerError),
  };

  private static TimeSpan TryGetRetryAfter(Exception ex)
  {
    // Reflect over a public TimeSpan property named RetryAfter if present.
    var prop = ex.GetType().GetProperty("RetryAfter", typeof(TimeSpan));
    if (prop?.GetValue(ex) is TimeSpan span && span > TimeSpan.Zero)
    {
      return span;
    }
    return TimeSpan.FromSeconds(1);
  }

  private static string BuildSafeDetail(Exception ex)
  {
    // Only use Message — never Source, StackTrace, or type names. Truncate defensively.
    var msg = ex.Message ?? string.Empty;
    const int max = 512;
    return msg.Length > max ? msg[..max] : msg;
  }
}
