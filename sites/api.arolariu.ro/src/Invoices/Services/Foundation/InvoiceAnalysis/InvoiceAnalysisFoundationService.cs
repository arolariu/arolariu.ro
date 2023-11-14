using arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.ReceiptRecognizerBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public partial class InvoiceAnalysisFoundationService : IInvoiceAnalysisFoundationService
{
    private readonly IAnalysisBroker analysisBroker;
    private readonly ITranslatorBroker translatorBroker;
    private readonly IReceiptRecognizerBroker receiptRecognizerBroker;
    private readonly ILogger<IInvoiceAnalysisFoundationService> logger;

    /// <summary>
    /// DI Constructor.
    /// </summary>
    /// <param name="analysisBroker"></param>
    /// <param name="translatorBroker"></param>
    /// <param name="receiptRecognizerBroker"></param>
    /// <param name="loggerFactory"></param>
    public InvoiceAnalysisFoundationService(
        IAnalysisBroker analysisBroker,
        ITranslatorBroker translatorBroker,
        IReceiptRecognizerBroker receiptRecognizerBroker,
        ILoggerFactory loggerFactory)
    {
        this.analysisBroker = analysisBroker;
        this.translatorBroker = translatorBroker;
        this.receiptRecognizerBroker = receiptRecognizerBroker;
        logger = loggerFactory.CreateLogger<IInvoiceAnalysisFoundationService>();
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
