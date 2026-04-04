namespace arolariu.Backend.Core.Auth.Endpoints;

using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

public static partial class AuthEndpoints
{
  /// <summary>
  /// Handles user logout operations by terminating the current authentication session.
  /// This endpoint signs out the authenticated user and invalidates their session.
  /// </summary>
  /// <param name="signInManager">
  /// The <see cref="SignInManager{TUser}"/> service for managing user authentication sessions.
  /// This service handles the logout process and session cleanup.
  /// </param>
  /// <param name="loggerFactory">
  /// The <see cref="ILoggerFactory"/> service for creating loggers to track logout operations.
  /// Used to log successful logouts and failed logout attempts.
  /// </param>
  /// <param name="empty">
  /// A placeholder object for the request body. The presence of this parameter validates
  /// that the logout request is intentional and not accidental.
  /// </param>
  /// <returns>
  /// An <see cref="IResult"/> indicating the outcome of the logout operation.
  /// Returns Ok (200) on successful logout or Unauthorized (401) for invalid requests.
  /// </returns>
  /// <remarks>
  /// This handler performs the following operations:
  /// - Validates that the logout request includes a request body
  /// - Signs out the current user using ASP.NET Core Identity
  /// - Clears authentication cookies and session data
  /// - Logs the logout operation (success or failure)
  /// - Returns appropriate HTTP status codes based on the operation result
  /// </remarks>
  /// <example>
  /// <code>
  /// // Client usage example
  /// POST /logout
  /// Content-Type: application/json
  /// Authorization: Bearer {jwt-token}
  ///
  /// {}
  ///
  /// // Successful response: 200 OK
  /// // Failed response: 401 Unauthorized
  /// </code>
  /// </example>
  private static async Task<IResult> LogoutRoute(
    [FromServices] SignInManager<IdentityUser> signInManager,
    [FromServices] ILoggerFactory loggerFactory,
    [FromBody] object empty)
  {
    var logger = loggerFactory.CreateLogger("arolariu.Backend.Core.Auth");
    if (empty != null)
    {
      await signInManager.SignOutAsync().ConfigureAwait(false);
      logger.LogUserLoggedOut();
      AuthMetrics.Logouts.Add(1);
      return Results.Ok();
    }

    logger.LogLogoutFailed();
    AuthMetrics.LogoutFailures.Add(1);
    return Results.Unauthorized();
  }
}
