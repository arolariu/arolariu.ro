namespace arolariu.Backend.Core.Auth.Endpoints;

using System.Diagnostics.CodeAnalysis;

using Microsoft.AspNetCore.Routing;

/// <summary>
/// Provides endpoint mapping for authentication and authorization operations.
/// This partial class defines the authentication API endpoints using ASP.NET Core minimal APIs.
/// </summary>
/// <remarks>
/// This class manages authentication endpoints including:
/// - User registration and account creation
/// - Login and logout operations
/// - Password management and recovery
/// - Email confirmation and verification
/// - Account management operations
/// </remarks>
/// <example>
/// <code>
/// // Usage in application configuration
/// var app = builder.Build();
/// app.MapAuthEndpoints(); // Maps all authentication endpoints
/// </code>
/// </example>
[ExcludeFromCodeCoverage]
public static partial class AuthEndpoints
{
  private const string SemanticVersioning = "0.1.0-rc1";
  private const string EndpointNameTag = "Auth Management System v" + SemanticVersioning;

  /// <summary>
  /// Maps authentication endpoints to the application's routing system.
  /// This method configures all authentication-related API endpoints for user management operations.
  /// </summary>
  /// <param name="router">
  /// The <see cref="IEndpointRouteBuilder"/> used to define API routes and endpoints.
  /// This builder provides access to the application's routing configuration.
  /// </param>
  /// <remarks>
  /// This method configures:
  /// - Built-in ASP.NET Core Identity endpoints for standard authentication operations
  /// - Custom authentication endpoints for extended functionality
  /// - Proper versioning and tagging for API documentation
  /// - Security policies and authorization requirements
  /// </remarks>
  public static void MapAuthEndpoints(this IEndpointRouteBuilder router)
  {
    // This group contains the already built-in identity auth endpoints
    MapIdentityBuiltinEndpoints(router);
  }
}
