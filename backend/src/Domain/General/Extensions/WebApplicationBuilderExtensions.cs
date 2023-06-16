using arolariu.Backend.Domain.General.Services.Database;
using arolariu.Backend.Domain.General.Services.KeyVault;
using arolariu.Backend.Domain.General.Services.Swagger;
using arolariu.Backend.Domain.Invoices.Brokers;
using arolariu.Backend.Domain.Invoices.Foundation;
using arolariu.Backend.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;

using Azure.Identity;

using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using System;
using System.Data;

namespace arolariu.Backend.Domain.General.Extensions;

/// <summary>
/// Extension methods for <see cref="WebApplicationBuilder"/> to register general domain services.
/// This class is used by the <see cref="Program"/> class.
/// </summary>
internal static class WebApplicationBuilderExtensions
{
    /// <summary>
    /// Method that registers general domain services.
    /// This method is an extension method for <see cref="WebApplicationBuilder"/>.
    /// This method is used by the <see cref="Program"/> class.
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

    /// <summary>
    /// Populates the connection strings fields in the appsettings.json file.
    /// This method should be private and used only by the <see cref="AddGeneralDomainConfiguration(WebApplicationBuilder)"/> method.
    /// </summary>
    /// <param name="builder"></param>
    private static void PopulateConnectionStringsChapter(WebApplicationBuilder builder)
    {
        var keyVaultService = builder.Services.BuildServiceProvider().GetRequiredService<IKeyVaultService>();
        builder.Configuration["ConnectionStrings:arolariu-sql-connstring"] = keyVaultService.GetSecret("arolariu-sql-connstring");
        builder.Configuration["ConnectionStrings:arolariu-storage-connstring"] = keyVaultService.GetSecret("arolariu-storage-connstring");
        builder.Configuration["ConnectionStrings:arolariu-cosmosdb-connstring"] = keyVaultService.GetSecret("arolariu-cosmosdb-connstring");
        builder.Configuration["ConnectionStrings:arolariu-cognitive-services-connstring"] = keyVaultService.GetSecret("arolariu-cognitive-services-connString");
    }

    /// <summary>
    /// The method that registers the invoices domain services.
    /// This method is an extension method for <see cref="WebApplicationBuilder"/>.
    /// The method is used by the <see cref="Program"/> class.
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
