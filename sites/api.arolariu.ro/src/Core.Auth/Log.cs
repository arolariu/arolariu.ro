namespace arolariu.Backend.Core.Auth;

using System;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides source-generated, zero-allocation logging methods for the Core.Auth project.
/// Covers authentication, authorization, JWT token operations, and identity management.
/// </summary>
/// <remarks>
/// Event ID scheme for the Core.Auth project:
/// <list type="bullet">
///   <item><c>600_1xx</c> — Authentication operations (login, logout, registration)</item>
///   <item><c>600_2xx</c> — Authorization and JWT token operations</item>
///   <item><c>600_3xx</c> — Identity service configuration</item>
/// </list>
/// </remarks>
public static partial class Log
{
  #region Authentication Operations (600_1xx)

  /// <summary>
  /// Logs a successful user logout operation.
  /// </summary>
  [LoggerMessage(
    EventId = 600_100,
    Level = LogLevel.Information,
    Message = "User logged out successfully.")]
  public static partial void LogUserLoggedOut(this ILogger logger);

  /// <summary>
  /// Logs a failed logout attempt (e.g., missing request body).
  /// </summary>
  [LoggerMessage(
    EventId = 600_101,
    Level = LogLevel.Warning,
    Message = "Logout attempt failed — request body was null.")]
  public static partial void LogLogoutFailed(this ILogger logger);

  /// <summary>
  /// Logs that the authentication endpoints have been mapped.
  /// </summary>
  [LoggerMessage(
    EventId = 600_102,
    Level = LogLevel.Information,
    Message = "Authentication endpoints mapped — Identity API and custom auth routes registered.")]
  public static partial void LogAuthEndpointsMapped(this ILogger logger);

  #endregion

  #region Authorization and JWT Token Operations (600_2xx)

  /// <summary>
  /// Logs a JWT issuer signing key resolution with empty secret.
  /// </summary>
  [LoggerMessage(
    EventId = 600_200,
    Level = LogLevel.Warning,
    Message = "JWT issuer signing key resolution returned empty — JwtSecret is not configured.")]
  public static partial void LogJwtSecretMissing(this ILogger logger);

  /// <summary>
  /// Logs a JWT issuer validation failure.
  /// </summary>
  [LoggerMessage(
    EventId = 600_201,
    Level = LogLevel.Warning,
    Message = "JWT issuer validation failed — received '{ReceivedIssuer}', expected '{ExpectedIssuer}'.")]
  public static partial void LogJwtIssuerValidationFailed(this ILogger logger, string receivedIssuer, string expectedIssuer);

  /// <summary>
  /// Logs a JWT audience validation failure.
  /// </summary>
  [LoggerMessage(
    EventId = 600_202,
    Level = LogLevel.Warning,
    Message = "JWT audience validation failed — expected audience '{ExpectedAudience}' not found in token audiences.")]
  public static partial void LogJwtAudienceValidationFailed(this ILogger logger, string expectedAudience);

  /// <summary>
  /// Logs that the JWT issuer fallback was applied because no issuer was configured.
  /// </summary>
  [LoggerMessage(
    EventId = 600_203,
    Level = LogLevel.Debug,
    Message = "JWT issuer not configured — falling back to default issuer '{FallbackIssuer}'.")]
  public static partial void LogJwtIssuerFallback(this ILogger logger, string fallbackIssuer);

  /// <summary>
  /// Logs that the JWT audience fallback was applied because no audience was configured.
  /// </summary>
  [LoggerMessage(
    EventId = 600_204,
    Level = LogLevel.Debug,
    Message = "JWT audience not configured — falling back to default audience '{FallbackAudience}'.")]
  public static partial void LogJwtAudienceFallback(this ILogger logger, string fallbackAudience);

  #endregion

  #region Identity Service Configuration (600_3xx)

  /// <summary>
  /// Logs that authentication services (Identity, JWT, DbContext) have been configured.
  /// </summary>
  [LoggerMessage(
    EventId = 600_300,
    Level = LogLevel.Information,
    Message = "Authentication services configured — Identity, JWT Bearer, and AuthDbContext registered.")]
  public static partial void LogAuthServicesConfigured(this ILogger logger);

  /// <summary>
  /// Logs that the authentication middleware pipeline has been applied.
  /// </summary>
  [LoggerMessage(
    EventId = 600_301,
    Level = LogLevel.Information,
    Message = "Authentication middleware pipeline applied — AuthN and AuthZ middleware registered.")]
  public static partial void LogAuthMiddlewareApplied(this ILogger logger);

  /// <summary>
  /// Logs a failure during AuthDbContext configuration (e.g., missing SQL connection string).
  /// </summary>
  [LoggerMessage(
    EventId = 600_302,
    Level = LogLevel.Error,
    Message = "AuthDbContext configuration failed — SQL connection string may be missing or invalid.")]
  public static partial void LogAuthDbContextConfigurationFailed(this ILogger logger, Exception exception);

  #endregion
}
