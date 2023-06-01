using Microsoft.Extensions.DependencyInjection;
using System.Data.SqlClient;
using System.Data;
using System;
using Microsoft.AspNetCore.Builder;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using ContainerBackend.Domain.General.Services.KeyVault;

namespace ContainerBackend.Domain.General.Services
{
    /// <summary>
    /// The builder DI service.
    /// </summary>
    public static class BuilderDIService
    {
        /// <summary>
        /// The builder DI service for general domain configuration.
        /// </summary>
        public static IServiceCollection AddGeneralDomainConfiguration(this WebApplicationBuilder builder)
        {
            var services = builder.Services;
            var configuration = builder.Configuration;
            services.AddAuthorization();
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen();
            services.AddHttpClient();
            services.AddSingleton<IKeyVaultService>(new KeyVaultService(configuration));
            services.AddCors(options =>
            {
                options.AddPolicy("AllowAllOrigins", builder =>
                {
                    builder.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
            });

            return services;
        }

#pragma warning disable S125 // Sections of code should not be commented out
        ///// <summary>
        ///// The builder DI service.
        ///// </summary>
        //public static IServiceCollection AddInvoicesDomainConfiguration(this WebApplicationBuilder builder)

                            //{
                            //    var services = builder.Services;
                            //    const string connStringSecret = "arolariu-sql-connstring";
                            //    var connStringValue = keyVaultService.GetSecret(connStringSecret);
                            //    services.AddSingleton<IDbConnection>(new SqlConnection(connStringValue));

        //    return services;
        //}
#pragma warning restore S125 // Sections of code should not be commented out
    }
}
