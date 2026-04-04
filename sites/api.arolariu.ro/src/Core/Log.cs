namespace arolariu.Backend.Core;

using System;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides source-generated, zero-allocation logging methods for the Core project.
/// Covers application startup, middleware pipeline, general domain configuration, and health checks.
/// </summary>
/// <remarks>
/// Event ID scheme for the Core project:
/// <list type="bullet">
///   <item><c>500_1xx</c> — Application startup and domain configuration</item>
///   <item><c>500_2xx</c> — Middleware pipeline and request processing</item>
///   <item><c>500_3xx</c> — Health checks and infrastructure probes</item>
/// </list>
/// </remarks>
internal static partial class Log
{
  #region Startup and Domain Configuration (500_1xx)

  /// <summary>
  /// Logs that the general domain configuration phase has started.
  /// </summary>
  [LoggerMessage(
    EventId = 500_100,
    Level = LogLevel.Information,
    Message = "General domain configuration started.")]
  public static partial void LogGeneralDomainConfigurationStarted(this ILogger logger);

  /// <summary>
  /// Logs that the general domain configuration phase completed successfully.
  /// </summary>
  [LoggerMessage(
    EventId = 500_101,
    Level = LogLevel.Information,
    Message = "General domain configuration completed.")]
  public static partial void LogGeneralDomainConfigurationCompleted(this ILogger logger);

  /// <summary>
  /// Logs that the proxy configuration fetch from the exp service has started.
  /// </summary>
  [LoggerMessage(
    EventId = 500_102,
    Level = LogLevel.Information,
    Message = "Fetching proxy configuration from exp service at '{ProxyEndpoint}'.")]
  public static partial void LogProxyConfigurationFetchStarted(this ILogger logger, string proxyEndpoint);

  /// <summary>
  /// Logs that the proxy configuration fetch completed and how many keys were loaded.
  /// </summary>
  [LoggerMessage(
    EventId = 500_103,
    Level = LogLevel.Information,
    Message = "Proxy configuration fetched successfully — {KeyCount} key(s) loaded.")]
  public static partial void LogProxyConfigurationFetchCompleted(this ILogger logger, int keyCount);

  /// <summary>
  /// Logs a failure during proxy configuration fetch.
  /// </summary>
  [LoggerMessage(
    EventId = 500_104,
    Level = LogLevel.Error,
    Message = "Proxy configuration fetch failed from '{ProxyEndpoint}'.")]
  public static partial void LogProxyConfigurationFetchFailed(this ILogger logger, Exception exception, string proxyEndpoint);

  /// <summary>
  /// Logs that OpenTelemetry signal providers have been configured.
  /// </summary>
  [LoggerMessage(
    EventId = 500_105,
    Level = LogLevel.Information,
    Message = "OpenTelemetry configured — Logging, Tracing, and Metering providers registered.")]
  public static partial void LogOTelConfigured(this ILogger logger);

  /// <summary>
  /// Logs that the Invoices domain configuration has been applied.
  /// </summary>
  [LoggerMessage(
    EventId = 500_106,
    Level = LogLevel.Information,
    Message = "Invoices domain configuration applied.")]
  public static partial void LogInvoicesDomainConfigured(this ILogger logger);

  /// <summary>
  /// Logs the application startup summary with environment details.
  /// </summary>
  [LoggerMessage(
    EventId = 500_107,
    Level = LogLevel.Information,
    Message = "Application started — Environment: {Environment}, Host: {HostName}.")]
  public static partial void LogApplicationStarted(this ILogger logger, string environment, string hostName);

  #endregion

  #region Middleware Pipeline and Request Processing (500_2xx)

  /// <summary>
  /// Logs that the general application pipeline configuration has started.
  /// </summary>
  [LoggerMessage(
    EventId = 500_200,
    Level = LogLevel.Information,
    Message = "Application pipeline configuration started.")]
  public static partial void LogPipelineConfigurationStarted(this ILogger logger);

  /// <summary>
  /// Logs that the general application pipeline configuration completed.
  /// </summary>
  [LoggerMessage(
    EventId = 500_201,
    Level = LogLevel.Information,
    Message = "Application pipeline configuration completed — CORS, rate limiting, security headers, Swagger all wired.")]
  public static partial void LogPipelineConfigurationCompleted(this ILogger logger);

  /// <summary>
  /// Logs that security headers middleware has injected headers into a response.
  /// </summary>
  [LoggerMessage(
    EventId = 500_202,
    Level = LogLevel.Debug,
    Message = "Security headers injected for request path '{RequestPath}'.")]
  public static partial void LogSecurityHeadersInjected(this ILogger logger, string requestPath);

  /// <summary>
  /// Logs that Swagger/OpenAPI endpoints have been configured.
  /// </summary>
  [LoggerMessage(
    EventId = 500_203,
    Level = LogLevel.Information,
    Message = "Swagger/OpenAPI configured at '{SwaggerPath}'.")]
  public static partial void LogSwaggerConfigured(this ILogger logger, string swaggerPath);

  #endregion

  #region Health Checks and Infrastructure (500_3xx)

  /// <summary>
  /// Logs that health check endpoints have been registered.
  /// </summary>
  [LoggerMessage(
    EventId = 500_300,
    Level = LogLevel.Information,
    Message = "Health check endpoints registered at '{HealthPath}'.")]
  public static partial void LogHealthChecksRegistered(this ILogger logger, string healthPath);

  /// <summary>
  /// Logs a health check probe result.
  /// </summary>
  [LoggerMessage(
    EventId = 500_301,
    Level = LogLevel.Debug,
    Message = "Health check completed — Status: {Status}, Duration: {DurationMs}ms.")]
  public static partial void LogHealthCheckCompleted(this ILogger logger, string status, double durationMs);

  #endregion
}
