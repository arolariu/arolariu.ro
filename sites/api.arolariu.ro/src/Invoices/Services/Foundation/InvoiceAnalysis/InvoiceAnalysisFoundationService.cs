using arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.Extensions.Configuration;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public partial class InvoiceAnalysisFoundationService : IInvoiceAnalysisFoundationService
{
    private readonly AzureOpenAiBroker azureOpenAiBroker;
    private readonly AzureTranslatorBroker azureTranslatorBroker;
    private readonly AzureFormRecognizerBroker azureFormRecognizerBroker;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration"></param>
    public InvoiceAnalysisFoundationService(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        azureOpenAiBroker = new AzureOpenAiBroker(configuration);
        azureTranslatorBroker = new AzureTranslatorBroker(configuration);
        azureFormRecognizerBroker = new AzureFormRecognizerBroker(configuration);
    }

    /// <inheritdoc/>
    public async Task AnalyzeInvoiceAsync(Invoice invoice, AnalysisOptionsDto options) =>
    await TryCatchAsync(async () =>
    {
        ValidateInvoiceExists(invoice);
        ValidateAnalysisOptionsAreSet(options);

        switch (options)
        {
            default:
                await Task.CompletedTask.ConfigureAwait(false);
                break;
        }
    }).ConfigureAwait(false);
}
