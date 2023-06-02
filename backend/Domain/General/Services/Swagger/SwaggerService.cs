using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.Swagger;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;
using System;
using System.IO;
using System.Reflection;

namespace ContainerBackend.Domain.General.Services.Swagger
{
    /// <summary>
    /// Swagger service options and configuration.
    /// </summary>
    public static class SwaggerService
    {

        /// <summary>
        /// Get the swagger UI options.
        /// </summary>
        /// <returns><see cref="SwaggerUIOptions"/> object.</returns>
        public static SwaggerUIOptions GetSwaggerUIOptions()
        {
            var options = new SwaggerUIOptions()
            {
                RoutePrefix = string.Empty,
                DocumentTitle = "AROLARIU.RO Public API",
                ConfigObject = new ConfigObject()
                {
                    PersistAuthorization = true,
                    DisplayOperationId = true,
                    DisplayRequestDuration = true,
                },
            };

            options.SwaggerEndpoint("/swagger/v1/swagger.json", "AROLARIU.RO Public API");

            return options;
        }

        /// <summary>
        /// Get the swagger options.
        /// </summary>
        /// <returns><see cref="SwaggerOptions"/> object.</returns>
        public static SwaggerOptions GetSwaggerOptions()
        {
            SwaggerOptions options = new SwaggerOptions();
            return options;
        }

        /// <summary>
        /// Get the swagger generator options.
        /// </summary>
        /// <returns><see cref="SwaggerGenOptions"/> object.</returns>
        public static Action<SwaggerGenOptions> GetSwaggerGenOptions()
        {
            var options = new Action<SwaggerGenOptions>(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo()
                {
                    Title = "AROLARIU.RO Public API",
                    Version = "v1",
                    Description = "AROLARIU.RO Public API",
                    Contact = new OpenApiContact()
                    {
                        Name = "Alexandru-Razvan Olariu",
                        Email = "admin@arolariu.ro"
                    }
                });
                options.EnableAnnotations();
                var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
                options.IncludeXmlComments(xmlPath);
            });

            return options;
        }
    }
}
