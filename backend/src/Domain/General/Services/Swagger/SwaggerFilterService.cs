using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.SwaggerGen;

namespace arolariu.Backend.Domain.General.Services.Swagger;

/// <summary>
/// The swagger filter service filters endpoints from discovery.
/// </summary>
public class SwaggerFilterService : IDocumentFilter
{
    /// <summary>
    /// Applies the Swagger document filter by filtering endpoints from discovery.
    /// </summary>
    /// <param name="swaggerDoc">The Swagger document being filtered.</param>
    /// <param name="context">The context of the document filter.</param>
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        FilterEndpointsFromDiscovery(swaggerDoc);
    }

    /// <summary>
    /// Filters out specified endpoints from the Swagger document.
    /// </summary>
    /// <param name="swaggerDoc">The Swagger document to be filtered.</param>
    private static void FilterEndpointsFromDiscovery(OpenApiDocument swaggerDoc)
    {
        var ignoredEndpoints = new[]
                    {
            "/health",
            "/terms",
        };

        foreach (var endpoint in ignoredEndpoints)
            swaggerDoc.Paths.Remove(endpoint);
    }
}
