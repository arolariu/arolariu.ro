namespace arolariu.Backend.Core.Auth.Endpoints;

using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

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
		[FromBody] object empty)
	{
		if (empty != null)
		{
			await signInManager.SignOutAsync().ConfigureAwait(false);
			return Results.Ok();
		}

		return Results.Unauthorized();
	}
}
