using Azure.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.DependencyInjection;
using System.Data;
using System;
using Microsoft.Extensions.Configuration;
using arolariu.Backend.Domain.General.Services.KeyVault;
using arolariu.Backend.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Domain.General.Services.Swagger;
using arolariu.Backend.Domain.General.Services.Database;
using arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Brokers;
using arolariu.Backend.Domain.Invoices.Foundation;

namespace arolariu.Backend.Domain.General.Extensions
{
    internal static class WebApplicationBuilderExtensions
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
            services.AddSwaggerGen(SwaggerConfigurationService.GetSwaggerGenOptions());
            services.AddHttpClient();
            services.AddHttpContextAccessor();
            services.AddLocalization();

            services.AddSingleton<IKeyVaultService, KeyVaultService>();
            PopulateConnectionStringsChapter(builder);
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
                .AddAzureBlobStorage(config.GetConnectionString("arolariu-storage-connstring")!)
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

        private static void PopulateConnectionStringsChapter(WebApplicationBuilder builder)
        {
            var keyVaultService = builder.Services.BuildServiceProvider().GetRequiredService<IKeyVaultService>();
            builder.Configuration["ConnectionStrings:arolariu-sql-connstring"] = keyVaultService.GetSecret("arolariu-sql-connstring");
            builder.Configuration["ConnectionStrings:arolariu-storage-connstring"] = keyVaultService.GetSecret("arolariu-storage-connstring");
            builder.Configuration["ConnectionStrings:arolariu-cosmosdb-connstring"] = keyVaultService.GetSecret("arolariu-cosmosdb-connstring");
            builder.Configuration["ConnectionStrings:arolariu-cognitive-services-connstring"] = keyVaultService.GetSecret("arolariu-cognitive-services-connString");
        }

        /// <summary>
        /// The builder DI service.
        /// </summary>
        /// <param name="builder"></param>
        public static IServiceCollection AddInvoicesDomainConfiguration(this WebApplicationBuilder builder)

        {
            var services = builder.Services;
            services.AddSingleton<IInvoiceSqlBroker, InvoiceSqlBroker>();
            services.AddSingleton<IInvoiceReaderService, InvoiceReaderService>();
            services.AddSingleton<IInvoiceStorageService, InvoiceStorageService>();
            services.AddSingleton<IInvoiceFoundationService, InvoiceFoundationService>();
            return services;
        }
    }
}
