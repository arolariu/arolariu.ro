namespace arolariu.Backend.Common.Http;

using System;
using System.Threading;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

/// <summary>
/// Builds the request-scoped cancellation tokens used by endpoint handlers, and classifies
/// why a cancellation occurred.
/// </summary>
/// <remarks>
/// <para><b>Two-tier policy.</b> Reads follow <see cref="HttpContext.RequestAborted"/>, so a client
/// that hangs up immediately frees server resources. Writes deliberately ignore client disconnect —
/// aborting a half-finished mutation leaves the caller unable to tell whether it landed — but still
/// honour application shutdown and an explicit budget so no operation is unbounded.</para>
/// <para><b>Classification.</b> <see cref="HttpContext.RequestAborted"/> is cancelled both by a client
/// abort and by the request-timeout middleware, so it cannot distinguish them. The timeout feature's
/// token is cancelled only by the timeout, which makes it the reliable discriminator.</para>
/// </remarks>
public static class RequestCancellation
{
  /// <summary>
  /// Non-standard status code (nginx convention) meaning the client closed the connection before a
  /// response was produced. Writing it is a no-op when the client has genuinely gone away; it exists
  /// so logs and tests can distinguish this path from a real error.
  /// </summary>
  public const int ClientClosedRequest = 499;

  /// <summary>Budget for ordinary CRUD mutations.</summary>
  public static readonly TimeSpan CrudWriteBudget = TimeSpan.FromSeconds(30);

  /// <summary>
  /// Budget for the invoice analysis pipeline. Matches the Document Intelligence client's
  /// 5-minute network timeout configured in <c>AzureFormRecognizerBroker</c>.
  /// </summary>
  public static readonly TimeSpan AnalysisWriteBudget = TimeSpan.FromSeconds(300);

  /// <summary>Returns the token a read operation should observe.</summary>
  /// <param name="context">The current HTTP context; must not be <see langword="null"/>.</param>
  /// <returns>The request-abort token, cancelled by client disconnect or request timeout.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="context"/> is null.</exception>
  public static CancellationToken ForRead(HttpContext context)
  {
    ArgumentNullException.ThrowIfNull(context);
    return context.RequestAborted;
  }

  /// <summary>
  /// Creates the cancellation scope a write operation should observe: linked to application
  /// shutdown and bounded by <paramref name="budget"/>, but deliberately NOT linked to
  /// <see cref="HttpContext.RequestAborted"/>.
  /// </summary>
  /// <param name="context">The current HTTP context; must not be <see langword="null"/>.</param>
  /// <param name="budget">Maximum time the write may take before it is cancelled.</param>
  /// <returns>A new source the caller owns and MUST dispose.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="context"/> is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="budget"/> is negative or otherwise invalid for
  /// <see cref="CancellationTokenSource.CancelAfter(TimeSpan)"/>.
  /// </exception>
  public static CancellationTokenSource ForWrite(HttpContext context, TimeSpan budget)
  {
    ArgumentNullException.ThrowIfNull(context);

    var lifetime = context.RequestServices.GetService<IHostApplicationLifetime>();
    var source = lifetime is null
      ? new CancellationTokenSource()
      : CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);

    try
    {
      source.CancelAfter(budget);
    }
    catch
    {
      source.Dispose();
      throw;
    }

    return source;
  }

  /// <summary>
  /// Determines whether the current request was cancelled by the server-side request timeout
  /// rather than by the client disconnecting.
  /// </summary>
  /// <param name="context">The current HTTP context; must not be <see langword="null"/>.</param>
  /// <returns><see langword="true"/> if the request timeout fired; otherwise <see langword="false"/>.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="context"/> is null.</exception>
  public static bool WasTimeout(HttpContext context)
  {
    ArgumentNullException.ThrowIfNull(context);

    var feature = context.Features.Get<IHttpRequestTimeoutFeature>();
    return feature?.RequestTimeoutToken.IsCancellationRequested == true;
  }
}

/// <summary>Names of the registered request-timeout policies.</summary>
public static class RequestTimeoutPolicies
{
  /// <summary>Policy for ordinary CRUD endpoints (30 seconds).</summary>
  public const string Crud = "crud";

  /// <summary>Policy for the invoice analysis endpoint (300 seconds).</summary>
  public const string Analysis = "analysis";
}
