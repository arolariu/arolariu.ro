using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.SwaggerGen;

using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Core.Domain.General.Services.Swagger;

/// <summary>
/// The swagger filter service represents the service that filters the swagger document.
/// This service is used to filter the swagger document and remove the endpoints that are not needed.
/// This service is also used to add external documentation to the swagger document.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
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
        AddExternalDocumentation(swaggerDoc);
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

    /// <summary>
    /// Adds the API external documentation to the Swagger document.
    /// </summary>
    /// <param name="swaggerDoc"></param>
    private static void AddExternalDocumentation(OpenApiDocument swaggerDoc)
    {
#pragma warning disable S1075 // URIs should not be hardcoded
        swaggerDoc.ExternalDocs = new OpenApiExternalDocs()
        {
            Description = "Check the API docs here!",
            Url = new Uri("https://docs.arolariu.ro"),
        };
#pragma warning restore S1075 // URIs should not be hardcoded
    }
}
