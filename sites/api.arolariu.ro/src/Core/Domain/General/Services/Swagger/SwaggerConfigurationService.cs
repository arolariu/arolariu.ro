namespace arolariu.Backend.Core.Domain.General.Services.Swagger;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.Swagger;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;

/// <summary>
/// Provides centralized configuration for Swagger/OpenAPI documentation generation and UI presentation.
/// This service configures the API documentation system used by the arolariu.ro public API,
/// including custom schemas, authentication requirements, and presentation options.
/// </summary>
/// <remarks>
/// <para>
/// This service is responsible for configuring three main aspects of Swagger integration:
/// - Swagger generation options for OpenAPI specification creation
/// - Swagger UI options for the interactive documentation interface
/// - Swagger middleware options for serving the documentation
/// </para>
/// <para>
/// The generated documentation is available at the following endpoints:
/// - Swagger UI: https://api.arolariu.ro/ (root path)
/// - OpenAPI JSON: https://api.arolariu.ro/swagger/v1/swagger.json
/// - Terms of Service: https://api.arolariu.ro/terms
/// </para>
/// <para>
/// The configuration includes:
/// - JWT Bearer token authentication scheme
/// - Custom type mappings for common response types
/// - XML documentation comments integration
/// - Enhanced UI features and customization
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested as it primarily consists of configuration logic.
internal static class SwaggerConfigurationService
{
  /// <summary>
  /// Configures the Swagger UI presentation options and behavior.
  /// This method customizes the interactive documentation interface for enhanced developer experience.
  /// </summary>
  /// <returns>
  /// A configured <see cref="SwaggerUIOptions"/> instance with customized settings for the API documentation interface.
  /// </returns>
  /// <remarks>
  /// <para>
  /// The returned configuration includes the following customizations:
  /// </para>
  /// <para>
  /// <strong>Navigation and Routing:</strong>
  /// - Sets the route prefix to empty string, making Swagger UI available at the root path
  /// - Configures the document title as "AROLARIU.RO Public API"
  /// </para>
  /// <para>
  /// <strong>Authentication and Persistence:</strong>
  /// - Enables authorization persistence across browser sessions
  /// - Maintains user authentication state during documentation exploration
  /// </para>
  /// <para>
  /// <strong>Display and Interaction Features:</strong>
  /// - Shows operation IDs for easier API reference
  /// - Displays request duration for performance monitoring
  /// - Enables syntax highlighting for better code readability
  /// - Configures model rendering to show examples by default
  /// - Sets appropriate expansion depth for nested models (2 levels)
  /// - Enables filtering capabilities for large API surfaces
  /// - Shows OpenAPI extensions and common extensions
  /// </para>
  /// </remarks>
  internal static SwaggerUIOptions GetSwaggerUIOptions()
  {
    var options = new SwaggerUIOptions()
    {
      RoutePrefix = string.Empty,
      DocumentTitle = "AROLARIU.RO Public API",
      ExposeSwaggerDocumentUrlsRoute = true,
      ConfigObject = new ConfigObject()
      {
        DeepLinking = true,
        DisplayOperationId = true,
        DefaultModelsExpandDepth = 5,
        DefaultModelExpandDepth = 5,
        DefaultModelRendering = ModelRendering.Example,
        DisplayRequestDuration = true,
        DocExpansion = DocExpansion.List,
        Filter = "true",
        ShowExtensions = true,
        ShowCommonExtensions = true,
        PersistAuthorization = true,
        TryItOutEnabled = true,
      },
    };

    options.ConfigObject.AdditionalItems.Add("syntaxHighlight", "true");


    // OpenAPI spec endpoints:
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Public API (Swagger OpenAPI 3.0)");
    options.SwaggerEndpoint("/openapi/v1.json", "Public API (MS OpenAPI 3.0)");

    return options;
  }

  /// <summary>
  /// Provides basic Swagger middleware configuration options.
  /// This method returns default options for the Swagger JSON endpoint serving.
  /// </summary>
  /// <returns>
  /// A <see cref="SwaggerOptions"/> instance with default configuration for serving OpenAPI specifications.
  /// </returns>
  /// <remarks>
  /// This method currently returns default options without customization.
  /// It serves as a placeholder for future middleware-specific configuration needs,
  /// such as custom serialization settings or route templates.
  /// </remarks>
  internal static SwaggerOptions GetSwaggerOptions()
  {
    SwaggerOptions options = new SwaggerOptions();
    return options;
  }

  /// <summary>
  /// Configures comprehensive Swagger generation options for OpenAPI specification creation.
  /// This method defines the complete API documentation structure, including metadata, security schemes,
  /// custom type mappings, and XML documentation integration.
  /// </summary>
  /// <returns>
  /// An <see cref="Action{SwaggerGenOptions}"/> delegate that configures Swagger generation with
  /// custom schemas, authentication, and documentation settings.
  /// </returns>
  /// <remarks>
  /// <para>
  /// This method configures extensive Swagger generation options:
  /// </para>
  /// <para>
  /// <strong>API Metadata:</strong>
  /// - Sets comprehensive API information including title, version, and detailed description
  /// - Includes contact information and terms of service URL
  /// - Provides licensing information under MIT License
  /// </para>
  /// <para>
  /// <strong>Security Configuration:</strong>
  /// - Defines JWT Bearer token authentication scheme
  /// - Configures security requirements for protected endpoints
  /// - Includes detailed authentication instructions for API consumers
  /// </para>
  /// <para>
  /// <strong>Custom Type Mappings:</strong>
  /// - Maps <see cref="IResult"/> to standardized response schema with success, message, and data properties
  /// - Maps <see cref="ProblemDetails"/> to RFC 7807 problem details schema
  /// - Maps <see cref="IEnumerable{T}"/> of key-value pairs to array schema for metadata responses
  /// </para>
  /// <para>
  /// <strong>Documentation Enhancement:</strong>
  /// - Enables Swashbuckle annotations for enhanced API documentation
  /// - Uses inline definitions for enums to improve schema readability
  /// - Integrates XML documentation comments from compiled assembly
  /// - Applies custom document filters for additional processing
  /// </para>
  /// <para>
  /// The generated OpenAPI specification follows OpenAPI 3.0 standards and includes
  /// comprehensive schema definitions for all API operations, enabling automatic
  /// client code generation and interactive testing.
  /// </para>
  /// </remarks>
  internal static Action<SwaggerGenOptions> GetSwaggerGenOptions()
  {
    var options = new Action<SwaggerGenOptions>(options =>
    {
      const string welcomeInformaiton = "Welcome to the `api.arolariu.ro` website. This platform servers as a front-facing API web application, designed to allow **YOU**, the reader, possibility to interact and observe how this API works and behaves under certain conditions.\r\n\r\n";
      const string generalInformation = "This API is used by the plethora of services hosted both on the `*.arolariu.ro` domain space, and outside it - be it in desktop applications, mobile applications, or other services. \r\nThe API is public, and can be used by anyone, as long as they follow basic consumption rules (pleae read the Terms of service before using the API).\r\nThis API is maintained by ALEXANDRU-RAZVAN OLARIU, and is an integral part of the <em>arolariu.ro</em> project space.\r\n\r\nThe API is engineered in respects to the ability to adapt and scale horizontally; it also imposes a rate limit on requests, to adopt a fair-share methodology of consumption.\r\n\r\n";
      const string licenseInformation = "<hr/>\r\n\r\n <em>Copyright © 2024 ALEXANDRU-RAZVAN OLARIU</em>\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\r\n\r\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\r\n\r\nTHE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.";

      const string swaggerDocDescription = welcomeInformaiton + generalInformation + licenseInformation;

#pragma warning disable S1075 // URIs should not be hardcoded
      options.SwaggerDoc("v1", new OpenApiInfo()
      {
        Title = "Public API — AROLARIU.RO",
        Version = "v1.0.0",
        Description = swaggerDocDescription,
        Contact = new OpenApiContact()
        {
          Name = "the author, Alexandru-Razvan Olariu.",
          Email = "admin@arolariu.ro"
        },
        License = new OpenApiLicense()
        {
          Name = "MIT License",
          Url = new Uri("https://opensource.org/license/mit/"),
        },
        TermsOfService = new Uri("https://api.arolariu.ro/terms"),
      });
#pragma warning restore S1075 // URIs should not be hardcoded

      options.EnableAnnotations();
      options.UseInlineDefinitionsForEnums();
      options.DocumentFilter<SwaggerFilterService>();

      options.MapType<IResult>(() => new OpenApiSchema()
      {
        Type = "object",
        Properties = new Dictionary<string, OpenApiSchema>()
        {
          ["success"] = new OpenApiSchema()
          {
            Type = "boolean",
            Description = "Indicates whether the operation was successful or not.",
          },
          ["message"] = new OpenApiSchema()
          {
            Type = "string",
            Description = "The message associated with the operation.",
          },
          ["data"] = new OpenApiSchema()
          {
            Type = "object",
            Description = "The data associated with the operation.",
          },
        },
      });

      options.MapType<ProblemDetails>(() => new OpenApiSchema()
      {
        Type = "object",
        Properties = new Dictionary<string, OpenApiSchema>()
        {
          ["type"] = new OpenApiSchema()
          {
            Type = "string",
            Description = "The type of the problem.",
          },
          ["title"] = new OpenApiSchema()
          {
            Type = "string",
            Description = "The title of the problem.",
          },
          ["status"] = new OpenApiSchema()
          {
            Type = "integer",
            Description = "The status code of the problem.",
          },
          ["detail"] = new OpenApiSchema()
          {
            Type = "string",
            Description = "The detail of the problem.",
          },
          ["instance"] = new OpenApiSchema()
          {
            Type = "string",
            Description = "The instance of the problem.",
          },
        },
      });

      options.MapType<IEnumerable<KeyValuePair<string, string>>>(() => new OpenApiSchema()
      {
        Type = "array",
        Items = new OpenApiSchema()
        {
          Type = "object",
          Properties = new Dictionary<string, OpenApiSchema>()
          {
            ["key"] = new OpenApiSchema()
            {
              Type = "string",
              Description = "The key of the pair.",
            },
            ["value"] = new OpenApiSchema()
            {
              Type = "string",
              Description = "The value of the pair.",
            },
          },
        },
      });

      var jwtReferenceObject = new OpenApiReference()
      {
        Id = "Bearer",
        Type = ReferenceType.SecurityScheme,
      };

      options.AddSecurityRequirement(new OpenApiSecurityRequirement()
      {
        {
          new OpenApiSecurityScheme()
          {
            Reference = jwtReferenceObject
          },
          new [] { jwtReferenceObject.Id }
        },
      });

      options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
      {
        Scheme = "Bearer",
        Description = "Most of the endpoints that are currently present on the `api.arolariu.ro` platform may require auth.\n" +
                "Please enter your JWT Bearer Token in the below field, in order to persist it across this request(s) session.",
        Name = "JWT Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Reference = jwtReferenceObject
      });

      options.UseInlineDefinitionsForEnums();

      // We have the following XML documentation files generated by the build:
      // - arolariu.Backend.Common.xml
      // - arolariu.Backend.Core.xml
      // - arolariu.Backend.Core.Auth.xml
      // - arolariu.Backend.Domain.Invoices.xml
      // So we'll have to include them all in the Swagger doc generation.
      options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "arolariu.Backend.Common.xml"), true);
      options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "arolariu.Backend.Core.xml"), true);
      options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "arolariu.Backend.Core.Auth.xml"), true);
      options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "arolariu.Backend.Domain.Invoices.xml"), true);
    });

    return options;
  }
}
