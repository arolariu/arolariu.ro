namespace arolariu.Backend.Core.Auth.Endpoints;
using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

public static partial class AuthEndpoints
{
	/// <summary>
	/// Method that maps the already built-in identity auth endpoints.
	/// </summary>
	/// <param name="router"></param>
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
