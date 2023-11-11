using arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Domain.Invoices.Brokers.ReceiptRecognizerBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// </summary>
[ExcludeFromCodeCoverage] // This class is not tested because it is a simple extension class.
public static class WebApplicationBuilderExtensions
{
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
        ArgumentNullException.ThrowIfNull(builder);

        // Broker services:
        builder.Services.AddScoped<IAnalysisBroker, AzureOpenAiBroker>();
        builder.Services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
        builder.Services.AddScoped<IReceiptRecognizerBroker, AzureFormRecognizerBroker>();
        builder.Services.AddScoped<ITranslatorBroker, AzureTranslatorBroker>();

        // Foundation services:
        builder.Services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
        builder.Services.AddScoped<IInvoiceAnalysisFoundationService, InvoiceAnalysisFoundationService>();

        // Orchestration services:
        builder.Services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
    }
}
