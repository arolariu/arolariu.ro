using arolariu.Backend.Domain.General.Services.Swagger;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using System;

namespace arolariu.Backend.Domain.General.Extensions
{
    internal static class WebApplicationExtensions
    {
        /// <summary>
        /// The application DI service injection method.
        /// </summary>
        /// <param name="app"></param>
        /// <returns><see cref="IApplicationBuilder"/> application builder object.</returns>
        internal static IApplicationBuilder AddGeneralApplicationConfiguration(this WebApplication app)
        {
            ArgumentNullException.ThrowIfNull(app);
            app.UseStaticFiles();
            app.UseAuthorization();
            app.UseHttpsRedirection();
            app.UseCors("AllowAllOrigins");
            app.UseSwagger(SwaggerService.GetSwaggerOptions());
            app.UseSwaggerUI(SwaggerService.GetSwaggerUIOptions());
            return app;
        }

        /// <summary>
        /// Add general application endpoints such as `/health` and `/terms`.
        /// </summary>
        /// <param name="app"></param>
        /// <returns></returns>
        internal static IApplicationBuilder AddGeneralApplicationEndpoints(this WebApplication app)
        {
            const string termsAndConditions = "Hello";
            app
                .MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse });

            app
                .MapGet("/terms", [ApiExplorerSettings(IgnoreApi = true)]() => termsAndConditions);

            return app;
        }
    }
}
