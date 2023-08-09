using arolariu.Backend.Core.Domain.General.Services.Database;
using arolariu.Backend.Core.Domain.General.Services.KeyVault;
using arolariu.Backend.Core.Domain.General.Services.Swagger;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoicePhotoStorageBroker;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Core.Domain.Invoices.Services.Foundation;

using Azure.AI.FormRecognizer.DocumentAnalysis;
using Azure.Identity;

using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using System;
using System.Data;

namespace arolariu.Backend.Core.Domain.General.Extensions;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// This extension class acts as a IoC / DI container.
/// This class is used by the <see cref="Program"/> class.
/// This class represents the `Composition Root` of the application.
/// </summary>
internal static class WebApplicationBuilderExtensions
{
    /// <summary>
    /// Adds general domain configurations to the WebApplicationBuilder instance.
    /// </summary>
    /// <param name="builder">The WebApplicationBuilder instance.</param>
    /// <returns>The modified IServiceCollection instance.</returns>
    /// <remarks>
    /// This method configures various services and settings related to the general domain.
    /// It adds authorization, API explorer endpoints, Swagger documentation generation, HTTP client, HTTP context accessor,
    /// localization support, key vault service, connection strings, cross-origin resource sharing (CORS), health checks,
    /// and Azure services integration.
    /// </remarks>
    /// <example>
    /// <code>
    /// // Configure general domain configurations
    /// services.AddGeneralDomainConfiguration(builder);
    /// </code>
    /// </example>
    /// <seealso cref="WebApplicationBuilder"/>
    /// <seealso cref="IServiceCollection"/>
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
    /// Populates the connection strings chapter in the WebApplicationBuilder instance.
    /// </summary>
    /// <param name="builder">The WebApplicationBuilder instance.</param>
    /// <remarks>
    /// This method retrieves secrets from the key vault service and populates the connection strings
    /// chapter in the configuration of the WebApplicationBuilder instance.
    /// The connection strings are stored with corresponding keys: arolariu-sql-connstring,
    /// arolariu-storage-connstring, arolariu-cosmosdb-connstring, and arolariu-cognitive-services-connstring.
    /// </remarks>
    private static void PopulateConnectionStringsChapter(WebApplicationBuilder builder)
    {
        var keyVaultService = builder.Services.BuildServiceProvider().GetRequiredService<IKeyVaultService>();
        builder.Configuration["ConnectionStrings:arolariu-sql-connstring"] = keyVaultService.GetSecret("arolariu-sql-connstring");
        builder.Configuration["ConnectionStrings:arolariu-storage-connstring"] = keyVaultService.GetSecret("arolariu-storage-connstring");
        builder.Configuration["ConnectionStrings:arolariu-cosmosdb-connstring"] = keyVaultService.GetSecret("arolariu-cosmosdb-connstring");
        builder.Configuration["ConnectionStrings:arolariu-cognitive-services-connstring"] = keyVaultService.GetSecret("arolariu-cognitive-services-connString");
    }

    /// <summary>
    /// Adds invoices domain configurations to the WebApplicationBuilder instance.
    /// </summary>
    /// <param name="builder">The WebApplicationBuilder instance.</param>
    /// <returns>The modified IServiceCollection instance.</returns>
    /// <remarks>
    /// This method configures services related to the invoices domain.
    /// It adds singleton instances of the invoice SQL broker, invoice reader service,
    /// invoice storage service, and invoice foundation service.
    /// </remarks>
    /// <example>
    /// <code>
    /// // Configure invoices domain configurations
    /// services.AddInvoicesDomainConfiguration(builder);
    /// </code>
    /// </example>
    /// <seealso cref="WebApplicationBuilder"/>
    /// <seealso cref="IServiceCollection"/>
    public static IServiceCollection AddInvoicesDomainConfiguration(this WebApplicationBuilder builder)

    {
        var services = builder.Services;

        // Brokers:
        services.AddSingleton<IInvoiceAnalysisBroker<AnalyzedDocument>, InvoiceAnalysisAzureAIBroker>();
        services.AddSingleton<IInvoiceStorageBroker, InvoiceAzureStorageBroker>();
        services.AddSingleton<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();

        // Foundation services:
        services.AddSingleton<IInvoiceFoundationService, InvoiceFoundationService<AnalyzedDocument>>();
        return services;
    }
}
