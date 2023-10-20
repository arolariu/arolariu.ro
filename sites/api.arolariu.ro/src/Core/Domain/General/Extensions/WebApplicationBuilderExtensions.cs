using arolariu.Backend.Domain.Invoices.Brokers.InvoicePhotoStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Core.Domain.General.Extensions;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// This extension class acts as a IoC / DI container.
/// This class is used by the <see cref="Program"/> class.
/// This class represents the `Composition Root` of the application.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
internal static partial class WebApplicationBuilderExtensions
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
    public static void AddGeneralDomainConfiguration(this WebApplicationBuilder builder)
    {
        ConfigureAuthN(builder);
        ConfigureAuthZ(builder);

        ConfigureKeyVaultIntegration(builder);
        ConfigureHttpSettings(builder);
        ConfigureLocalization(builder);

        ConfigureSwaggerUI(builder);
        PopulateConfigurationWithCorrectValues(builder);
        ConfigureDataLayer(builder);
        ConfigureHealthChecks(builder);
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
    public static void AddInvoicesDomainConfiguration(this WebApplicationBuilder builder)
    {
        // Broker services:
        builder.Services.AddScoped<IInvoiceStorageBroker, InvoiceAzureStorageBroker>();
        builder.Services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();

        // Foundation services:
        builder.Services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
        builder.Services.AddScoped<IInvoiceAnalysisFoundationService, InvoiceAnalysisFoundationService>();

        // Orchestration services:
        builder.Services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
    }
}
