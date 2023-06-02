using Microsoft.Extensions.DependencyInjection;
using System.Data;
using System;
using Microsoft.AspNetCore.Builder;
using Azure.Identity;
using ContainerBackend.Domain.General.Services.KeyVault;
using ContainerBackend.Domain.General.Services.Swagger;
using ContainerBackend.Domain.General.Services.Database;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;

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
            var config = builder.Configuration;

            services.AddAuthorization();
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(SwaggerService.GetSwaggerGenOptions());
            services.AddHttpClient();

            services.AddSingleton<IKeyVaultService, KeyVaultService>();
            PopulateAppSettingsFromKeyVaultService(builder);
            services.AddSingleton<IDbConnectionFactory<IDbConnection>>(new SqlDbConnectionFactory(config.GetConnectionString("arolariu-sql-connstring")!));
            services.AddSingleton<IDbConnectionFactory<CosmosClient>>(new NoSqlDbConnectionFactory(config.GetConnectionString("arolariu-cosmosdb-connstring")!));
            services.AddCors(options =>
            {
                options.AddPolicy("AllowAllOrigins", builder =>
                {
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
            });

            services
                .AddHealthChecks()
                .AddSqlServer(config.GetConnectionString("arolariu-sql-connstring")!)
                .AddCosmosDb(config.GetConnectionString("arolariu-cosmosdb-connstring")!)
                .AddAzureKeyVault(
                    new Uri(config["Azure:KeyVault:Uri"]!),
                    new DefaultAzureCredential(),
                    options =>
                    {
                        options
                        .AddSecret("arolariu-sql-connstring")
                        .AddSecret("arolariu-cosmosdb-connstring");
                    });

            return services;
        }

        private static void PopulateAppSettingsFromKeyVaultService(WebApplicationBuilder builder)
        {
            var services = builder.Services;
            var keyVaultService = services.BuildServiceProvider().GetRequiredService<IKeyVaultService>();
            var sqlConnectionString = keyVaultService.GetSecret("arolariu-sql-connstring");
            var cosmosDbConnectionString = keyVaultService.GetSecret("arolariu-cosmosdb-connstring");
            builder.Configuration["ConnectionStrings:arolariu-sql-connstring"] = sqlConnectionString;
            builder.Configuration["ConnectionStrings:arolariu-cosmosdb-connstring"] = cosmosDbConnectionString;
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
