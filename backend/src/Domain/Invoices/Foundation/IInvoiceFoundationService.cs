using arolariu.Backend.Domain.Invoices.Brokers;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Models;
using arolariu.Backend.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Foundation;

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
    /// Process a new invoice object and publish it into the system.
    /// </summary>
    /// <param name="postedInvoiceDto">The <see cref="PostedInvoiceDto"/> containing the posted invoice information.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation, yielding the processed <see cref="Invoice"/>.</returns>
    public Task<Invoice> PublishNewInvoiceObjectIntoTheSystemAsync(PostedInvoiceDto postedInvoiceDto);

    /// <summary>
    /// Retrieve an existing invoice based on its identifier from the system.
    /// </summary>
    /// <param name="invoiceIdentifier">The identifier of the invoice to retrieve.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation, yielding the retrieved <see cref="Invoice"/>.</returns>
    public Task<Invoice> RetrieveExistingInvoiceBasedOnIdentifierAsync(Guid invoiceIdentifier);
}
