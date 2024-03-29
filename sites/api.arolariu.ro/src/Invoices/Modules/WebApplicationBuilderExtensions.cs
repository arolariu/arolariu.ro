﻿using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration;

using Azure.AI.FormRecognizer.DocumentAnalysis;

using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Modules;

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

        // Add Entity Framework Core services.
        builder.Services.AddDbContextPool<InvoiceNoSqlBroker>(options =>
        {
            options.UseCosmos(
                connectionString: builder.Configuration[$"{nameof(AzureOptions)}:NoSqlConnectionString"]!,
                databaseName: "arolariu");
        });

        // HTTP typed client services:
        builder.Services.AddHttpClient<OpenAIService>((serviceProvider, httpClient) =>
        {
            var azureOptions = serviceProvider.GetRequiredService<IOptionsMonitor<AzureOptions>>().CurrentValue;
            httpClient.BaseAddress = new Uri($"{azureOptions.OpenAIEndpoint}/openai");
            httpClient.DefaultRequestHeaders.Add("api-key", azureOptions.OpenAIKey);
        });

        // Broker services:
        builder.Services.AddScoped<IClassifierBroker, AzureOpenAiBroker>();
        builder.Services.AddScoped<IIdentifierBroker<AnalyzedDocument>, AzureFormRecognizerBroker>();
        builder.Services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
        builder.Services.AddScoped<ITranslatorBroker, AzureTranslatorBroker>();

        // Foundation services:
        builder.Services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
        builder.Services.AddScoped<IInvoiceAnalysisFoundationService, InvoiceAnalysisFoundationService>();

        // Orchestration services:
        builder.Services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
    }
}
