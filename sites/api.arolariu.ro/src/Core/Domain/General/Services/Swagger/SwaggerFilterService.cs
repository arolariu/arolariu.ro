namespace arolariu.Backend.Core.Domain.General.Services.Swagger;

using System;
using System.Diagnostics.CodeAnalysis;

using Microsoft.OpenApi;

using Swashbuckle.AspNetCore.SwaggerGen;

/// <summary>
/// Implements custom filtering and enhancement logic for the OpenAPI/Swagger document generation.
/// This service processes the generated Swagger document to remove internal endpoints from public documentation
/// and adds external documentation references to improve API discoverability.
/// </summary>
/// <remarks>
/// <para>
/// This document filter is automatically applied during Swagger document generation and performs two main functions:
/// </para>
/// <para>
/// <strong>Endpoint Filtering:</strong>
/// Removes internal or infrastructure endpoints from the public API documentation to keep the documentation
/// focused on business functionality. Filtered endpoints include health checks and utility endpoints
/// that are not intended for public consumption.
/// </para>
/// <para>
/// <strong>Documentation Enhancement:</strong>
/// Adds references to external documentation sources, providing API consumers with additional resources
/// for comprehensive API understanding and integration guidance.
/// </para>
/// <para>
/// The filter is registered automatically through the Swagger configuration and executes during
/// the document generation process, ensuring that the final OpenAPI specification reflects
/// only the intended public API surface.
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested as it primarily consists of document processing logic.
[SuppressMessage("Design", "CA1812:Avoid uninstantiated internal classes", Justification = "Instantiated by the Swagger middleware during document generation.")]
internal sealed class SwaggerFilterService : IDocumentFilter
{
  /// <summary>
  /// Applies the document filter transformations to the OpenAPI document.
  /// This method executes the filtering and enhancement logic to customize the generated API documentation.
  /// </summary>
  /// <param name="swaggerDoc">
  /// The <see cref="OpenApiDocument"/> being processed. This document contains the complete API specification
  /// including all discovered endpoints, schemas, and metadata.
  /// </param>
  /// <param name="context">
  /// The <see cref="DocumentFilterContext"/> providing access to additional generation context,
  /// including type information, method descriptors, and configuration details.
  /// </param>
  /// <remarks>
  /// <para>
  /// This method performs document transformations in the following order:
  /// 1. Filters out internal endpoints that should not appear in public documentation
  /// 2. Adds external documentation references to enhance API discoverability
  /// </para>
  /// <para>
  /// The filtering ensures that only business-relevant endpoints are exposed in the public API documentation,
  /// while utility endpoints like health checks remain functional but undocumented.
  /// </para>
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="swaggerDoc"/> is null.
  /// </exception>
  public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
  {
    ArgumentNullException.ThrowIfNull(swaggerDoc);
    FilterEndpointsFromDiscovery(swaggerDoc);
    FilterTagsFromDiscovery(swaggerDoc);
    AddExternalDocumentation(swaggerDoc);
  }

  /// <summary>
  /// Removes specified internal endpoints from the public API documentation.
  /// This method ensures that infrastructure and utility endpoints are not exposed in the generated documentation.
  /// </summary>
  /// <param name="swaggerDoc">
  /// The <see cref="OpenApiDocument"/> from which to remove endpoints.
  /// The document's Paths collection will be modified to exclude filtered endpoints.
  /// </param>
  /// <remarks>
  /// <para>
  /// The following endpoint categories are filtered from public documentation:
  /// </para>
  /// <para>
  /// <strong>Health Check Endpoints (/health):</strong>
  /// These endpoints are used for infrastructure monitoring and load balancer health checks.
  /// While essential for operations, they don't provide business value to API consumers.
  /// </para>
  /// <para>
  /// <strong>Utility Endpoints (/terms):</strong>
  /// Simple utility endpoints that serve static content or configuration values.
  /// These endpoints are typically used by the application itself rather than external integrators.
  /// </para>
  /// <para>
  /// Filtered endpoints remain functional and accessible; they are simply excluded from
  /// the generated OpenAPI documentation to maintain focus on business functionality.
  /// </para>
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="swaggerDoc"/> is null.
  /// </exception>
  private static void FilterEndpointsFromDiscovery(OpenApiDocument swaggerDoc)
  {
    ArgumentNullException.ThrowIfNull(swaggerDoc);

    var ignoredEndpoints = new[]
    {
      "/health",
      "/terms",
    };

    foreach (var endpoint in ignoredEndpoints)
    {
      swaggerDoc.Paths.Remove(endpoint);
    }
  }

  /// <summary>
  /// Removes specified tags from the OpenAPI document.
  /// This ensures that internal or unwanted tags do not clutter the documentation.
  /// </summary>
  /// <param name="swaggerDoc">The OpenAPI document.</param>
  private static void FilterTagsFromDiscovery(OpenApiDocument swaggerDoc)
  {
    ArgumentNullException.ThrowIfNull(swaggerDoc);

    var ignoredTags = new[]
    {
      "InvoiceEndpoints",
      "arolariu.Backend.Core",
    };

    if (swaggerDoc.Tags is not null)
    {
      foreach (var tag in ignoredTags)
      {
        var openApiTag = new OpenApiTag { Name = tag };
        swaggerDoc.Tags.Remove(openApiTag);
      }
    }
  }

  /// <summary>
  /// Adds external documentation references to enhance the OpenAPI document with additional resources.
  /// This method provides API consumers with links to comprehensive documentation and integration guides.
  /// </summary>
  /// <param name="swaggerDoc">
  /// The <see cref="OpenApiDocument"/> to enhance with external documentation references.
  /// The document's ExternalDocs property will be set with documentation links.
  /// </param>
  /// <remarks>
  /// <para>
  /// External documentation provides additional value to API consumers by offering:
  /// - Detailed integration guides and tutorials
  /// - Comprehensive API usage examples
  /// - Architecture and design documentation
  /// - Best practices and implementation patterns
  /// </para>
  /// <para>
  /// The external documentation is hosted separately from the interactive Swagger UI,
  /// allowing for more detailed explanations, code samples, and integration scenarios
  /// that complement the generated API reference.
  /// </para>
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="swaggerDoc"/> is null.
  /// </exception>
  private static void AddExternalDocumentation(OpenApiDocument swaggerDoc)
  {
    ArgumentNullException.ThrowIfNull(swaggerDoc);
    swaggerDoc.ExternalDocs = new OpenApiExternalDocs()
    {
      Description = "Check the API docs here!",
      Url = new Uri("https://docs.arolariu.ro"),
    };
  }
}
