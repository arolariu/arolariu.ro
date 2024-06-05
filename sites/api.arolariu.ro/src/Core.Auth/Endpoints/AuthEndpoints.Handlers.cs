namespace arolariu.Backend.Core.Auth.Endpoints;

using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

public static partial class AuthEndpoints
{
	/// <summary>
	/// Endpoint for logging out the current user.
	/// </summary>
	/// <param name="signInManager"></param>
	/// <param name="empty"></param>
	/// <returns></returns>
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
