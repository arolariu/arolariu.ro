using Microsoft.AspNetCore.Builder;
using ContainerBackend.Domain.General.Services.Swagger;

namespace ContainerBackend.Domain.General.Services
{
    /// <summary>
    /// The application DI service.
    /// </summary>
    public static class ApplicationDIService
    {
        /// <summary>
        /// The application DI service injection method.
        /// </summary>
        /// <param name="app"></param>
        /// <returns><see cref="IApplicationBuilder"/> application builder object.</returns>
        public static IApplicationBuilder AddGeneralApplicationConfiguration(this IApplicationBuilder app)
        {
            app.UseSwagger(SwaggerService.GetSwaggerOptions());
            app.UseSwaggerUI(SwaggerService.GetSwaggerUIOptions());
            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.UseStaticFiles();
            app.UseCors("AllowAllOrigins");
            return app;
        }
    }
}
