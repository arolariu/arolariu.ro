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
			  .WithOpenApi();
	}
}
