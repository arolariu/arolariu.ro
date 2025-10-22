namespace arolariu.Backend.Core.Auth.Modules;

using System;

using arolariu.Backend.Core.Auth.Endpoints;

using Microsoft.AspNetCore.Builder;

/// <summary>
/// Provides extension methods for configuring authentication and authorization middleware in the request pipeline.
/// This class sets up the authentication flow including endpoint mapping and middleware ordering.
/// </summary>
/// <remarks>
/// This module configures the authentication pipeline in the correct order:
/// 1. Authentication endpoint mapping for login/logout operations
/// 2. Authentication middleware for token validation
/// 3. Authorization middleware for access control
/// </remarks>
/// <example>
/// <code>
/// // Usage in Program.cs
/// var app = builder.Build();
/// app.UseAuthServices();
/// </code>
/// </example>
public static class WebApplicationExtensions
{
  /// <summary>
  /// Configures the application to use comprehensive authentication and authorization middleware.
  /// This method sets up the complete authentication pipeline including endpoints and middleware.
  /// </summary>
  /// <param name="app">The <see cref="WebApplication"/> to configure with authentication services.</param>
  /// <remarks>
  /// This method configures the authentication pipeline in the proper sequence:
  /// - Maps authentication endpoints for user operations (login, logout, registration)
  /// - Enables authentication middleware for request identity validation
  /// - Enables authorization middleware for role and policy-based access control
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="app"/> is null.
  /// </exception>
  public static void UseAuthServices(this WebApplication app)
  {
    ArgumentNullException.ThrowIfNull(app);
    app.MapAuthEndpoints();
    app.UseAuthN();
    app.UseAuthZ();
  }

  /// <summary>
  /// Configures the application to use authentication middleware.
  /// This method enables request identity validation and token processing.
  /// </summary>
  /// <param name="app">The <see cref="WebApplication"/> to configure with authentication middleware.</param>
  /// <remarks>
  /// Authentication middleware:
  /// - Validates JWT tokens in request headers
  /// - Establishes user identity from valid tokens
  /// - Sets HttpContext.User for downstream middleware
  /// - Must be called before authorization middleware
  /// </remarks>
  private static void UseAuthN(this WebApplication app) => app.UseAuthentication();

  /// <summary>
  /// Configures the application to use authorization middleware.
  /// This method enables role-based and policy-based access control.
  /// </summary>
  /// <param name="app">The <see cref="WebApplication"/> to configure with authorization middleware.</param>
  /// <remarks>
  /// Authorization middleware:
  /// - Evaluates user permissions against endpoint requirements
  /// - Enforces role-based access control (RBAC)
  /// - Applies policy-based authorization rules
  /// - Must be called after authentication middleware
  /// </remarks>
  private static void UseAuthZ(this WebApplication app) => app.UseAuthorization();
}
