using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System;
using System.Linq;

namespace arolariu.Backend.Domain.General.Services.Swagger
{
    /// <summary>
    /// The swagger filter service filters endpoints from discovery.
    /// </summary>
    public class SwaggerFilterService : IDocumentFilter
    {
        /// <summary>
        /// Swagger Document filter `Apply` method.
        /// </summary>
        /// <param name="swaggerDoc"></param>
        /// <param name="context"></param>
        public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
        {
            FilterEndpointsFromDiscovery(swaggerDoc);
        }

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
}
