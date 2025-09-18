namespace arolariu.Backend.Core.Auth.Endpoints;

using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

public static partial class AuthEndpoints
{
  /// <summary>
  /// Maps the built-in ASP.NET Core Identity authentication endpoints and custom authentication routes.
  /// This method configures standard authentication operations and additional custom endpoints for user management.
  /// </summary>
  /// <param name="router">
  /// The <see cref="IEndpointRouteBuilder"/> used to register authentication endpoints.
  /// This builder provides access to the application's routing system for endpoint configuration.
  /// </param>
  /// <remarks>
  /// This method configures two main endpoint groups:
  ///
  /// 1. **Built-in Identity Endpoints** (/auth group):
  ///    - User registration and account creation
  ///    - Login with email/password authentication
  ///    - Password reset and recovery operations
  ///    - Email confirmation and verification
  ///    - Account management operations
  ///
  /// 2. **Custom Authentication Endpoints**:
  ///    - Enhanced logout functionality with proper session cleanup
  ///    - Additional security features and validation
  ///
  /// All endpoints are configured with:
  /// - Proper OpenAPI documentation for Swagger integration
  /// - Appropriate HTTP status code responses
  /// - Anonymous access where required for authentication flows
  /// - Consistent tagging for API organization
  /// </remarks>
  private static void MapIdentityBuiltinEndpoints(IEndpointRouteBuilder router)
  {
    router.MapGroup("/auth")
      .MapIdentityApi<AuthenticatedUser>()
      .WithTags(EndpointNameTag)
      .AllowAnonymous()
      .WithOpenApi();

    router.MapPost("/auth/logout", LogoutRoute)
      .Accepts<object>("application/json")
      .Produces(StatusCodes.Status200OK)
      .Produces(StatusCodes.Status401Unauthorized)
      .Produces(StatusCodes.Status500InternalServerError)
      .WithTags(EndpointNameTag)
      .AllowAnonymous()
      .WithOpenApi();
  }
}
