using Microsoft.AspNetCore.Routing;

namespace arolariu.Backend.Core.Domain.General.Endpoints;

/// <summary>
/// This class contains the general endpoints of the arolariu.ro domain space.
/// </summary>
public partial class GeneralEndpoints
{
    private const string SemanticVersioning = "1.0.0";
    private const string EndpointNameTag = "Standard Endpoints" + SemanticVersioning;

    /// <summary>
    /// This extension method maps the general endpoints of the arolariu.ro domain space.
    /// </summary>
    /// <param name="router"></param>
    public static void MapGeneralEndpoints(this IEndpointRouteBuilder router)
    {
        // Map the authentication & authorization endpoints.
        MapAuthEndpoints(router);
    }
}
