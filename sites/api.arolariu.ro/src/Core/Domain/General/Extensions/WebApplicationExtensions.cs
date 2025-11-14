namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Core.Domain.General.Middlewares;
using arolariu.Backend.Core.Domain.General.Services.Swagger;

using HealthChecks.UI.Client;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

/// <summary>
/// Provides extension methods for configuring the <see cref="WebApplication"/> request processing pipeline.
/// This class contains middleware configuration and request routing setup for the general domain.
/// </summary>
/// <remarks>
/// <para>
/// This class complements <see cref="WebApplicationBuilderExtensions"/> by configuring the request pipeline
/// after services have been registered. It sets up middleware in the correct order to ensure proper
/// request processing and response handling.
/// </para>
/// <para>
/// The middleware pipeline is configured in a specific order that follows ASP.NET Core best practices:
/// - Security middleware (HTTPS redirection)
/// - Static files serving
/// - Localization and CORS
/// - API documentation (Swagger)
/// - Health checks and monitoring
/// - Authentication and authorization
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested as it primarily consists of pipeline configuration logic.
internal static class WebApplicationExtensions
{
  /// <summary>
  /// Configures the <see cref="WebApplication"/> request pipeline with general domain middleware and routing.
  /// This method establishes the complete request processing pipeline for cross-cutting concerns.
  /// </summary>
  /// <param name="app">The <see cref="WebApplication"/> instance to configure with the request pipeline.</param>
  /// <returns>The same <see cref="WebApplication"/> instance for method chaining.</returns>
  /// <remarks>
  /// <para>
  /// This method configures the middleware pipeline in the following order:
  /// </para>
  /// <para>
  /// <strong>1. Static Files:</strong> Serves static content (CSS, JS, images) before other middleware
  /// to optimize performance and reduce unnecessary processing.
  /// </para>
  /// <para>
  /// <strong>2. HTTPS Redirection:</strong> Automatically redirects HTTP requests to HTTPS for security,
  /// ensuring all communication is encrypted in production environments.
  /// </para>
  /// <para>
  /// <strong>3. Request Localization:</strong> Enables multi-language support by detecting and setting
  /// the appropriate culture based on request headers, query parameters, or cookies.
  /// </para>
  /// <para>
  /// <strong>4. CORS (Cross-Origin Resource Sharing):</strong> Applies the "AllowAllOrigins" policy
  /// to enable cross-origin requests from web applications hosted on different domains.
  /// Note: This permissive policy should be restricted in production environments.
  /// </para>
  /// <para>
  /// <strong>5. Swagger Documentation:</strong> Configures OpenAPI/Swagger endpoints for API documentation
  /// and interactive testing interface, enhancing developer experience and API discoverability.
  /// </para>
  /// <para>
  /// <strong>6. Health Checks:</strong> Exposes the "/health" endpoint with detailed health information
  /// formatted for consumption by monitoring tools and health check dashboards.
  /// </para>
  /// <para>
  /// <strong>7. Terms and Conditions Endpoint:</strong> Maps a simple GET endpoint to retrieve
  /// terms and conditions from configuration, supporting legal compliance requirements.
  /// </para>
  /// <para>
  /// <strong>8. Authentication Services:</strong> Integrates authentication middleware and policies
  /// through the Auth module, enabling secure access to protected resources.
  /// </para>
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when the <paramref name="app"/> parameter is null.
  /// </exception>
  /// <example>
  /// <code>
  /// // Usage in Program.cs after building the WebApplication
  /// WebApplication app = builder.Build();
  /// app.AddGeneralApplicationConfiguration();
  ///
  /// // Continue with domain-specific pipeline configuration
  /// app.AddInvoiceDomainConfiguration();
  ///
  /// app.Run();
  /// </code>
  /// </example>
  /// <seealso cref="WebApplication"/>
  /// <seealso cref="WebApplicationBuilderExtensions.AddGeneralDomainConfiguration"/>
  internal static WebApplication AddGeneralApplicationConfiguration(this WebApplication app)
  {
    ArgumentNullException.ThrowIfNull(app);

    app.UseHttpsRedirection();

    #region Middlewares
    app.UseCors("AllowAllOrigins");
    app.UseMiddleware<SecurityHeadersMiddleware>();
    #endregion

    app.UseStaticFiles();
    app.UseRequestLocalization();
    app.UseSwagger(SwaggerConfigurationService.GetSwaggerOptions());
    app.UseSwaggerUI(SwaggerConfigurationService.GetSwaggerUIOptions());
    app.MapOpenApi();
    app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse });
    app.MapGet("/terms", () => app.Configuration["ApplicationOptions:TermsAndConditions"]);
    app.UseAuthServices();

    return app;
  }
}
