namespace arolariu.Backend.Common.Http;

/// <summary>
/// Stable RFC 7807 <c>type</c> URIs emitted by <c>ExceptionToHttpResultMapper</c>.
/// Treat these as part of the public API contract — do not rename without bumping the
/// major version of the API.
/// </summary>
public static class ProblemTypeUris
{
  private const string Root = "https://api.arolariu.ro/problems/";

  /// <summary>Problem type URI for validation failures (HTTP 400).</summary>
  public const string Validation          = Root + "validation";

  /// <summary>Problem type URI for missing resources (HTTP 404).</summary>
  public const string NotFound            = Root + "not-found";

  /// <summary>Problem type URI for resource conflicts (HTTP 409).</summary>
  public const string Conflict            = Root + "conflict";

  /// <summary>Problem type URI for locked resources (HTTP 423).</summary>
  public const string Locked              = Root + "locked";

  /// <summary>Problem type URI for rate-limited requests (HTTP 429).</summary>
  public const string RateLimited         = Root + "rate-limited";

  /// <summary>Problem type URI for unauthenticated requests (HTTP 401).</summary>
  public const string Unauthorized        = Root + "unauthorized";

  /// <summary>Problem type URI for forbidden requests (HTTP 403).</summary>
  public const string Forbidden           = Root + "forbidden";

  /// <summary>Problem type URI for upstream dependency failures (HTTP 502).</summary>
  public const string DependencyFailure   = Root + "dependency-failure";

  /// <summary>Problem type URI for unavailable services (HTTP 503).</summary>
  public const string ServiceUnavailable  = Root + "service-unavailable";

  /// <summary>Problem type URI for unhandled internal errors (HTTP 500).</summary>
  public const string InternalServerError = Root + "internal-error";
}
