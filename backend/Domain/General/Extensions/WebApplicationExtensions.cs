﻿using arolariu.Backend.Domain.General.Services.Swagger;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using System;

namespace arolariu.Backend.Domain.General.Extensions
{
    internal static class WebApplicationExtensions
    {
        /// <summary>
        /// The application DI service injection method.
        /// </summary>
        /// <param name="app"></param>
        /// <returns><see cref="WebApplication"/> application object.</returns>
        internal static WebApplication AddGeneralApplicationConfiguration(this WebApplication app)
        {
            ArgumentNullException.ThrowIfNull(app);
            app.UseStaticFiles();
            app.UseAuthorization();
            app.UseHttpsRedirection();
            app.UseRequestLocalization();
            app.UseCors("AllowAllOrigins");
            app.UseSwagger(SwaggerConfigurationService.GetSwaggerOptions());
            app.UseSwaggerUI(SwaggerConfigurationService.GetSwaggerUIOptions());
            return app;
        }

        /// <summary>
        /// Add general application endpoints such as `/health` and `/terms`.
        /// </summary>
        /// <param name="app"></param>
        /// <returns><see cref="WebApplication"/> application object.</returns>
        internal static WebApplication AddGeneralApplicationEndpoints(this WebApplication app)
        {
            app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse });
            app.MapGet("/terms", () => app.Configuration["TermsAndConditions"]);
            return app;
        }
    }
}
