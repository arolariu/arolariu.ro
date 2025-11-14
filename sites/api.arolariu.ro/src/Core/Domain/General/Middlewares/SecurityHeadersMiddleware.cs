namespace arolariu.Backend.Core.Domain.General.Middlewares;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

/// <summary>
/// Middleware that adds security headers to all HTTP responses to enhance application security posture.
/// Implements defense-in-depth security strategy through standardized HTTP response headers.
/// </summary>
/// <remarks>
/// <para>
/// This middleware adds the following security headers to every response:
/// </para>
/// <para>
/// <strong>X-Content-Type-Options:</strong> Prevents MIME type sniffing attacks by ensuring browsers
/// respect the declared Content-Type header. Set to "nosniff" to block interpretation of non-executable
/// files as executable content.
/// </para>
/// <para>
/// <strong>X-Frame-Options:</strong> Prevents clickjacking attacks by controlling whether the page
/// can be embedded in frames or iframes. Set to "DENY" to completely prohibit framing.
/// </para>
/// <para>
/// <strong>X-XSS-Protection:</strong> Enables XSS filtering in legacy browsers that still support
/// this header. Modern browsers rely on Content Security Policy instead.
/// </para>
/// <para>
/// <strong>Referrer-Policy:</strong> Controls how much referrer information is included with requests.
/// Set to "strict-origin-when-cross-origin" to send full URL for same-origin requests and only origin
/// for cross-origin requests over HTTPS.
/// </para>
/// <para>
/// <strong>Permissions-Policy:</strong> Restricts access to browser features and APIs to prevent
/// unauthorized use of sensitive capabilities like camera, geolocation, and microphone.
/// </para>
/// <para>
/// <strong>Strict-Transport-Security (HSTS):</strong> Enforces HTTPS connections for one year,
/// including all subdomains. Only applied in production environments. Includes preload directive
/// for browser HSTS preload lists.
/// </para>
/// <para>
/// <strong>Content-Security-Policy (CSP):</strong> Defines allowed sources for various resource types
/// to prevent XSS and data injection attacks. Only applied in production to avoid development friction.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Register in middleware pipeline (typically in WebApplicationExtensions)
/// app.UseMiddleware&lt;SecurityHeadersMiddleware&gt;();
/// </code>
/// </example>
[ExcludeFromCodeCoverage] // Infrastructure middleware - integration tested, not unit tested
#pragma warning disable CA1812
internal sealed class SecurityHeadersMiddleware
#pragma warning restore CA1812
{
  private readonly RequestDelegate _next;
  private readonly IHostEnvironment _environment;

  /// <summary>
  /// Initializes a new instance of the <see cref="SecurityHeadersMiddleware"/> class.
  /// </summary>
  /// <param name="next">The next middleware delegate in the request pipeline.</param>
  /// <param name="environment">The hosting environment information for environment-specific configuration.</param>
  public SecurityHeadersMiddleware(RequestDelegate next, IHostEnvironment environment)
  {
    _next = next ?? throw new ArgumentNullException(nameof(next));
    _environment = environment ?? throw new ArgumentNullException(nameof(environment));
  }

  /// <summary>
  /// Processes an HTTP request by adding security headers to the response.
  /// </summary>
  /// <param name="context">The <see cref="HttpContext"/> for the current request.</param>
  /// <returns>A task that represents the asynchronous operation.</returns>
  /// <remarks>
  /// This method adds security headers before invoking the next middleware in the pipeline.
  /// Headers are added early in the response lifecycle to ensure they are present even if
  /// downstream middleware modifies the response.
  /// </remarks>
  public async Task InvokeAsync(HttpContext context)
  {
    ArgumentNullException.ThrowIfNull(context);

    // Add security headers that apply to all environments
    AddCommonSecurityHeaders(context);

    // Add production-only security headers
    if (!_environment.IsDevelopment())
    {
      AddProductionSecurityHeaders(context);
    }

    // Continue processing the request
    await _next(context).ConfigureAwait(false);
  }

  /// <summary>
  /// Adds security headers that are safe and recommended for all environments.
  /// </summary>
  /// <param name="context">The HTTP context containing the response headers.</param>
  private static void AddCommonSecurityHeaders(HttpContext context)
  {
    var headers = context.Response.Headers;

    // X-Content-Type-Options: Prevents MIME type sniffing
    // Ensures browsers respect the declared Content-Type and prevents interpretation
    // of non-executable files as executable content (e.g., text/plain as text/html)
    headers.XContentTypeOptions = "nosniff";

    // X-Frame-Options: Prevents clickjacking attacks
    // DENY prohibits any domain from framing the content
    // Alternative: SAMEORIGIN allows framing only from same origin
    headers.XFrameOptions = "DENY";

    // X-XSS-Protection: Enables XSS filtering in legacy browsers
    // Modern browsers use CSP instead, but this provides defense in depth
    // Mode=block stops rendering the page if XSS is detected
    headers.XXSSProtection = "1; mode=block";

    // Referrer-Policy: Controls referrer information leakage
    // strict-origin-when-cross-origin sends full URL for same-origin,
    // only origin for cross-origin HTTPS, and nothing for HTTP destinations
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    // Permissions-Policy: Restricts access to sensitive browser features
    // Disables camera, microphone, geolocation, payment, and USB for all origins
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
  }

  /// <summary>
  /// Adds security headers that should only be applied in production environments.
  /// </summary>
  /// <param name="context">The HTTP context containing the response headers.</param>
  /// <remarks>
  /// These headers are excluded from development to avoid interference with local debugging
  /// and to allow HTTP connections during development.
  /// </remarks>
  private static void AddProductionSecurityHeaders(HttpContext context)
  {
    var headers = context.Response.Headers;

    // Strict-Transport-Security (HSTS): Enforces HTTPS connections
    // max-age=31536000: Policy valid for 1 year (365 days)
    // includeSubDomains: Apply policy to all subdomains
    // preload: Eligible for browser HSTS preload lists
    headers.StrictTransportSecurity = "max-age=31536000; includeSubDomains; preload";

    // Content-Security-Policy (CSP): Prevents XSS and data injection attacks
    // default-src 'self': Only allow resources from same origin by default
    // script-src 'self': Only allow scripts from same origin
    // style-src 'self' 'unsafe-inline': Allow same-origin styles and inline styles (for legacy support)
    // img-src 'self' data: https:: Allow images from same origin, data URIs, and HTTPS sources
    // font-src 'self': Only allow fonts from same origin
    // connect-src 'self': Only allow fetch/XHR to same origin
    // frame-ancestors 'none': Prevent embedding in frames (redundant with X-Frame-Options)
    // base-uri 'self': Restrict <base> tag URLs to same origin
    // form-action 'self': Only allow form submissions to same origin
    headers.ContentSecurityPolicy =
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'";
  }
}
