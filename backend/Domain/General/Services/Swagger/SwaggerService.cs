using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.Swagger;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;
using System;
using System.IO;
using System.Linq;
using System.Reflection;

namespace arolariu.Backend.Domain.General.Services.Swagger
{
    /// <summary>
    /// Swagger service options and configuration.
    /// </summary>
    internal static class SwaggerService
    {

        /// <summary>
        /// Get the swagger UI options.
        /// </summary>
        /// <returns><see cref="SwaggerUIOptions"/> object.</returns>
        internal static SwaggerUIOptions GetSwaggerUIOptions()
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
        internal static SwaggerOptions GetSwaggerOptions()
        {
            SwaggerOptions options = new SwaggerOptions();
            return options;
        }

        /// <summary>
        /// Get the swagger generator options.
        /// </summary>
        /// <returns><see cref="SwaggerGenOptions"/> object.</returns>
        internal static Action<SwaggerGenOptions> GetSwaggerGenOptions()
        {
            var options = new Action<SwaggerGenOptions>(options =>
            {
                const string welcomeInformaiton = "Welcome to the `api.arolariu.ro` website. This website is a front-facing API web application, meaning that the only purpose of this website is to give **YOU**, the reader, possibility to interact and observe how this API works and behaves under certain conditions.\r\n\r\n";
                const string generalInformation = "This API is used by the plethora of services hosted both on the `*.arolariu.ro` domain space, and outside it - be it in desktop applications, mobile applications, or other services. \r\nThe API is public, and can be used by anyone, as long as they follow basic consumption rules.\r\nThis API is maintained by ALEXANDRU-RAZVAN OLARIU, and is part of the __arolariu.ro__ project.\r\n\r\nThe API is able to adapt and scale horizontally; it also imposes a rate limit on requests, to adopt a fair-share methodology of consumption.\r\n\r\n";
                const string licenseInformation = "<hr/>\r\n\r\n <em>Copyright © 2023 ALEXANDRU-RAZVAN OLARIU</em>\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\r\n\r\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\r\n\r\nTHE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.";

                const string swaggerDocDescription = welcomeInformaiton + generalInformation + licenseInformation;
                options.SwaggerDoc("v1", new OpenApiInfo()
                {
                    Title = "Public API — AROLARIU.RO",
                    Version = "v1.0.0",
                    Description = swaggerDocDescription,
                    Contact = new OpenApiContact()
                    {
                        Name = "the author, Alexandru-Razvan Olariu.",
                        Email = "olariu.alexandru@pm.me"
                    },
                    TermsOfService = new Uri("/terms"),
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
