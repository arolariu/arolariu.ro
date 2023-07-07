using arolariu.Backend.Core.Domain.Invoices.Brokers;
using arolariu.Backend.Core.Domain.Invoices.Models;
using arolariu.Backend.Core.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Core.Domain.Invoices.Services.InvoiceStorage;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Foundation;

/// <summary>
/// The invoice foundation service.
/// </summary>
public class InvoiceFoundationService : IInvoiceFoundationService
{
    /// <inheritdoc/>
    public IInvoiceReaderService InvoiceReaderService { get; }

    /// <inheritdoc/>
    public IInvoiceStorageService InvoiceStorageService { get; }

    /// <inheritdoc/>
    public IInvoiceSqlBroker InvoiceSqlBroker { get; }

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="invoiceReaderService"></param>
    /// <param name="invoiceStorageService"></param>
    /// <param name="invoiceSqlBroker"></param>
    public InvoiceFoundationService(
        IInvoiceReaderService invoiceReaderService,
        IInvoiceStorageService invoiceStorageService,
        IInvoiceSqlBroker invoiceSqlBroker)
    {
        InvoiceReaderService = invoiceReaderService ?? throw new ArgumentNullException(nameof(invoiceReaderService));
        InvoiceStorageService = invoiceStorageService ?? throw new ArgumentNullException(nameof(invoiceStorageService));
        InvoiceSqlBroker = invoiceSqlBroker ?? throw new ArgumentNullException(nameof(invoiceSqlBroker));
    }

    /// <inheritdoc/>
    public Task<InvoiceStatus> RetrieveInvoiceStatus(Guid invoiceIdentifier)
    {
        throw new NotImplementedException();
    }

    /// <inheritdoc/>
    public async Task SendInvoiceForAnalysis(Invoice invoice)
    {
        var invoiceStatus = await InvoiceSqlBroker.RetrieveInvoiceStatus(invoice.InvoiceId);
        try
        {
            // Step 1: Send the invoice to the Azure Cognitive Services service.
            var analyzedInvoice = await InvoiceReaderService.SendInvoiceToCognitiveServices(invoice);
            var updatedInvoice = InvoiceReaderService.UpdateInvoiceWithAnalyzedData(invoice, analyzedInvoice);
            invoiceStatus = invoiceStatus with
            {
                IsAnalyzed = true,
                AnalyzedDate = DateTime.UtcNow,
                InvoiceLastModifiedDate = DateTime.UtcNow,
            };

            // Step 2: Update the invoice and its status to represent the state "Analyzed".
            await InvoiceSqlBroker.UpdateSpecificInvoice(updatedInvoice);
            await InvoiceSqlBroker.UpdateInvoiceStatus(invoice, invoiceStatus);
        }
        catch (Exception) // If an exception occurs, update the invoice status to represent the state "Not Analyzed".
        {
            invoiceStatus = invoiceStatus with
            {
                IsAnalyzed = false,
                InvoiceLastModifiedDate = DateTime.UtcNow,
            };
            await InvoiceSqlBroker.UpdateInvoiceStatus(invoice, invoiceStatus);
            throw;
        }
    }
}
