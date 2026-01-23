namespace arolariu.Backend.Core.Domain.General.Configuration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Security.Claims;
using System.Threading;
using System.Threading.RateLimiting;
using System.Threading.Tasks;

using arolariu.Backend.Common.Configuration;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Provides rate limiting service registration and configuration for the API.
/// This class configures the actual rate limiting policies referenced by <see cref="RateLimitPolicies"/>.
/// </summary>
/// <remarks>
/// <para>
/// Rate limiting is implemented using ASP.NET Core's built-in <see cref="Microsoft.AspNetCore.RateLimiting"/> middleware.
/// Policies are partitioned by user identity (authenticated) or IP address (anonymous), ensuring fair resource allocation.
/// </para>
/// <para>
/// When rate limits are exceeded, the API returns HTTP 429 (Too Many Requests) with a Retry-After header
/// indicating when the client may retry the request.
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage] // Infrastructure configuration code.
internal static class RateLimitConfiguration
{
  /// <summary>
  /// Registers rate limiting services and policies with the dependency injection container.
  /// </summary>
  /// <param name="services">The <see cref="IServiceCollection"/> to add services to.</param>
  /// <returns>The same <see cref="IServiceCollection"/> instance for method chaining.</returns>
  /// <remarks>
  /// <para>
  /// This method configures:
  /// <list type="bullet">
  ///   <item><description>Global rate limiter: 1000 requests per minute per IP (applies to all requests)</description></item>
  ///   <item><description>Named policies for different operation categories</description></item>
  ///   <item><description>Custom rejection handler with Retry-After header and JSON error response</description></item>
  /// </list>
  /// </para>
  /// </remarks>
  public static IServiceCollection AddRateLimitingPolicies(this IServiceCollection services)
  {
    services.AddRateLimiter(options =>
    {
      options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

      // Global limiter: 1000 requests per minute per IP
      options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
              RateLimitPartition.GetFixedWindowLimiter(
                  partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                  factory: _ => new FixedWindowRateLimiterOptions
                  {
                    PermitLimit = 1000,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 10
                  }));

      // Standard reads: 300 requests per minute per user
      options.AddPolicy(RateLimitPolicies.StandardReads, context =>
              RateLimitPartition.GetFixedWindowLimiter(
                  partitionKey: GetUserIdentifier(context),
                  factory: _ => new FixedWindowRateLimiterOptions
                  {
                    PermitLimit = 300,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 5
                  }));

      // Standard writes: 60 requests per minute per user
      options.AddPolicy(RateLimitPolicies.StandardWrites, context =>
              RateLimitPartition.GetFixedWindowLimiter(
                  partitionKey: GetUserIdentifier(context),
                  factory: _ => new FixedWindowRateLimiterOptions
                  {
                    PermitLimit = 60,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 2
                  }));

      // Analysis operations: 10 requests per hour per user (AI-intensive)
      options.AddPolicy(RateLimitPolicies.AnalysisOperations, context =>
              RateLimitPartition.GetFixedWindowLimiter(
                  partitionKey: GetUserIdentifier(context),
                  factory: _ => new FixedWindowRateLimiterOptions
                  {
                    PermitLimit = 10,
                    Window = TimeSpan.FromHours(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 1
                  }));

      // Health check: No limit (for monitoring systems)
      options.AddPolicy(RateLimitPolicies.HealthCheck, _ =>
              RateLimitPartition.GetNoLimiter<string>("health"));

      // Custom response for rate limit exceeded
      options.OnRejected = OnRateLimitRejectedAsync;
    });

    return services;
  }

  /// <summary>
  /// Extracts the user identifier from the HTTP context for rate limit partitioning.
  /// </summary>
  /// <param name="context">The current HTTP context.</param>
  /// <returns>
  /// The authenticated user's identifier (from claims) or the client's IP address for anonymous users.
  /// </returns>
  private static string GetUserIdentifier(HttpContext context)
  {
    // Try to get user ID from claims (authenticated users)
    var userId = context.User?.FindFirst("sub")?.Value
              ?? context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    // Fall back to IP address for anonymous users
    return userId ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
  }

  /// <summary>
  /// Handles rate limit rejection by returning a JSON error response with retry information.
  /// </summary>
  /// <param name="context">The rate limit rejection context.</param>
  /// <param name="cancellationToken">Cancellation token for the operation.</param>
  /// <returns>A task representing the asynchronous operation.</returns>
  private static async ValueTask OnRateLimitRejectedAsync(
      OnRejectedContext context,
      CancellationToken cancellationToken)
  {
    var retryAfterSeconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
        ? (int)retryAfter.TotalSeconds
        : 60;

    context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString(CultureInfo.InvariantCulture);

    await context.HttpContext.Response.WriteAsJsonAsync(new
    {
      type = "https://tools.ietf.org/html/rfc6585#section-4",
      title = "Too Many Requests",
      status = 429,
      detail = "Rate limit exceeded. Please retry after the specified time.",
      retryAfterSeconds
    }, cancellationToken).ConfigureAwait(false);
  }
}
