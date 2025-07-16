namespace arolariu.Backend.Core.Auth.Endpoints;

using System.Diagnostics.CodeAnalysis;

using Microsoft.AspNetCore.Routing;

/// <summary>
/// The auth endpoints.
/// </summary>
[ExcludeFromCodeCoverage]
public static partial class AuthEndpoints
{
	private const string SemanticVersioning = "0.1.0-rc1";
	private const string EndpointNameTag = "Auth Management System v" + SemanticVersioning;

	/// <summary>
	/// The map auth endpoints static method, called by the app builder.
	/// </summary>
	/// <param name="router"></param>
	public static void MapAuthEndpoints(this IEndpointRouteBuilder router)
	{
		// This group contains the already built-in identity auth endpoints
		MapIdentityBuiltinEndpoints(router);
	}
}
