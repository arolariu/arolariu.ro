using arolariu.Backend.Core.Domain.Invoices.Brokers;
using arolariu.Backend.Core.Domain.Invoices.Models;
using arolariu.Backend.Core.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Core.Domain.Invoices.Services.InvoiceStorage;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Foundation;

/// <summary>
/// The invoice foundation service.
/// This service is used by the <see cref="InvoiceFoundationService"/> class.
/// This interface acts as a mediator / aggregator for the <see cref="IInvoiceReaderService"/>,
/// <see cref="IInvoiceStorageService"/>, and <see cref="IInvoiceSqlBroker"/> contract.
/// </summary>
public interface IInvoiceFoundationService
{
    /// <summary>
    /// The injected invoice reader service.
    /// </summary>
    public IInvoiceReaderService InvoiceReaderService { get; }

    /// <summary>
    /// The injected invoice storage service.
    /// </summary>
    public IInvoiceStorageService InvoiceStorageService { get; }

    /// <summary>
    /// The injected invoice SQL broker.
    /// </summary>
    public IInvoiceSqlBroker InvoiceSqlBroker { get; }

    /// <summary>
    /// Send an invoice for analysis to the Azure Cognitive Services service.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public Task SendInvoiceForAnalysis(Invoice invoice);

    /// <summary>
    /// Retrieve the status of an invoice.
    /// This method retrieves the status of the invoice with the specified identifier.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the invoice status.</returns>
    public Task<InvoiceStatus> RetrieveInvoiceStatus(Guid invoiceIdentifier);
}
