using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Data.SqlClient;
using System.Data;

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
        /// <returns></returns>
        public static IApplicationBuilder AddGeneralApplicationConfiguration(this IApplicationBuilder app)
        {
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.UseCors("AllowAllOrigins");
            return app;
        }
    }
}
