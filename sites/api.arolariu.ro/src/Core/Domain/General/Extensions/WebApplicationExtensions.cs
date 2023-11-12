﻿using arolariu.Backend.Core.Domain.General.Services.Swagger;

using HealthChecks.UI.Client;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Core.Domain.General.Extensions;

/// <summary>
/// Extension methods for the <see cref="WebApplication"/> web application.
/// This extension class builds the Web Application.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
internal static partial class WebApplicationExtensions
{
    /// <summary>
    /// Adds general application configurations to the WebApplication instance.
    /// </summary>
    /// <param name="app">The WebApplication instance.</param>
    /// <returns>The modified WebApplication instance.</returns>
    /// <remarks>
    /// This method configures various settings and middleware for the general application.
    /// It enables static file serving, authorization, HTTPS redirection, request localization,
    /// cross-origin resource sharing (CORS), Swagger documentation, and Swagger UI.
    /// </remarks>
    /// <example>
    /// <code>
    /// // Configure general application configurations
    /// app.AddGeneralApplicationConfiguration();
    /// </code>
    /// </example>
    /// <seealso cref="WebApplication"/>
    internal static WebApplication AddGeneralApplicationConfiguration(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);
        app.UseStaticFiles();
        app.UseHttpsRedirection();
        app.UseRequestLocalization();
        app.UseCors("AllowAllOrigins");
        app.UseSwagger(SwaggerConfigurationService.GetSwaggerOptions());
        app.UseSwaggerUI(SwaggerConfigurationService.GetSwaggerUIOptions());
        return app;
    }

    /// <summary>
    /// Adds general application endpoints to the WebApplication instance.
    /// </summary>
    /// <param name="app">The WebApplication instance.</param>
    /// <returns>The modified WebApplication instance.</returns>
    /// <remarks>
    /// This method adds additional endpoints to the WebApplication for health checks and terms retrieval.
    /// It maps the "/health" endpoint to the health check UI response writer, and the "/terms" endpoint
    /// to retrieve the terms and conditions from the application configuration.
    /// </remarks>
    /// <example>
    /// <code>
    /// // Configure general application endpoints
    /// app.AddGeneralApplicationEndpoints();
    /// </code>
    /// </example>
    /// <seealso cref="WebApplication"/>
    /// <seealso cref="HealthCheckOptions"/>
    /// <seealso cref="UIResponseWriter"/>

    internal static WebApplication AddGeneralApplicationEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse });
        app.MapGet("/terms", () => app.Configuration["TermsAndConditions"]);
        return app;
    }
}
