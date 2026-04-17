namespace arolariu.Backend.Common.Http;

using System;
using System.Collections.Generic;
using System.Diagnostics;

using arolariu.Backend.Common.Exceptions;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

/// <summary>
/// Centralized translator from exception markers to RFC 7807 ProblemDetails with proper HTTP status codes.
/// Static because the mapping is a pure function of the exception chain and the current Activity.
/// </summary>
public static class ExceptionToHttpResultMapper
{
  /// <summary>Maps an exception to an <see cref="IResult"/> carrying an RFC 7807 ProblemDetails payload.</summary>
  public static IResult ToHttpResult(Exception exception, Activity? activity)
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

    if (root is IRateLimitedException rateLimited)
    {
      var retryAfter = rateLimited.RetryAfter > TimeSpan.Zero
        ? rateLimited.RetryAfter
        : TimeSpan.FromSeconds(1);
      extensions["retryAfterSeconds"] = (int)Math.Ceiling(retryAfter.TotalSeconds);
    }

    return TypedResults.Problem(new ProblemDetails
    {
      Status = status,
      Title = title,
      Type = type,
      Detail = BuildSafeDetail(root, status),
      Extensions = extensions,
    });
  }

  private static Exception FindClassifiableException(Exception ex)
  {
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
      or IForbiddenException
      or BadHttpRequestException;

  private static (int Status, string Title, string Type) SelectStatus(Exception ex) => ex switch
  {
    IUnauthorizedException => (401, "Unauthorized", ProblemTypeUris.Unauthorized),
    IForbiddenException => (403, "Forbidden", ProblemTypeUris.Forbidden),
    INotFoundException => (404, "Resource not found", ProblemTypeUris.NotFound),
    IAlreadyExistsException => (409, "Resource conflict", ProblemTypeUris.Conflict),
    ILockedException => (423, "Resource locked", ProblemTypeUris.Locked),
    IRateLimitedException => (429, "Too many requests", ProblemTypeUris.RateLimited),
    BadHttpRequestException badReq => (badReq.StatusCode, "Bad request", ProblemTypeUris.Validation),
    IValidationException => (400, "Validation failed", ProblemTypeUris.Validation),
    IDependencyValidationException => (400, "Dependency validation", ProblemTypeUris.Validation),
    IDependencyException => (503, "Service unavailable", ProblemTypeUris.ServiceUnavailable),
    IServiceException => (500, "Internal server error", ProblemTypeUris.InternalServerError),
    _ => (500, "Internal server error", ProblemTypeUris.InternalServerError),
  };

  private static string BuildSafeDetail(Exception ex, int status)
  {
    // Server-side and auth responses must NOT leak internal exception messages
    // (they can contain connection strings, identifiers, stack hints, etc.).
    // Client-attributable responses may echo the exception message (truncated).
    switch (status)
    {
      case 401: return "Authentication is required to access this resource.";
      case 403: return "You do not have permission to access this resource.";
      case 500: return "An unexpected error occurred. Please try again later.";
      case 503: return "A downstream service is temporarily unavailable. Please try again later.";
      default:
        var msg = ex.Message ?? string.Empty;
        const int max = 512;
        return msg.Length > max ? msg[..max] : msg;
    }
  }
}
