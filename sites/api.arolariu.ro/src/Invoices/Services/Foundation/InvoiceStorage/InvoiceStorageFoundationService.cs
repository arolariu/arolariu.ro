using arolariu.Backend.Domain.Invoices.Brokers.InvoicePhotoStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Entities.Invoices;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

/// <summary>
/// The Invoice Storage foundation service.
/// </summary>
public class InvoiceStorageFoundationService : IInvoiceStorageFoundationService
{
    private readonly IInvoiceStorageBroker invoiceStorageBroker;
    private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="invoiceStorageBroker"></param>
    /// <param name="invoiceNoSqlBroker"></param>
    public InvoiceStorageFoundationService(
        IInvoiceStorageBroker invoiceStorageBroker,
        IInvoiceNoSqlBroker invoiceNoSqlBroker)
    {
        this.invoiceStorageBroker = invoiceStorageBroker;
        this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    }

    /// <inheritdoc/>
    public async Task<Invoice> ConvertDtoToEntity(CreateInvoiceDto invoiceDto)
    {
        var invoice = Invoice.CreateNullInvoice();

        invoice.id = Guid.NewGuid(); // create a new invoice.
        var invoicePhotoUri = await invoiceStorageBroker
            .UploadInvoicePhotoToStorage(invoiceDto.InvoiceBase64Photo, invoice.id)
            .ConfigureAwait(false);

        return invoice with
        {
            ImageLocation = invoicePhotoUri,
            UploadedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            //TODO: add user identifier value here
        };
    }

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier)
    {
        var invoice = await invoiceNoSqlBroker
            .ReadInvoiceAsync(identifier)
            .ConfigureAwait(false);
        return invoice;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects()
    {
        var invoices = await invoiceNoSqlBroker
            .ReadInvoicesAsync()
            .ConfigureAwait(false);
        return invoices;
    }

    /// <inheritdoc/>
    public async Task UpdateInvoiceObject(Invoice invoice)
    {
        await invoiceNoSqlBroker
            .UpdateInvoiceAsync(invoice)
            .ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task DeleteInvoiceObject(Guid identifier)
    {
        await invoiceNoSqlBroker
            .DeleteInvoiceAsync(identifier)
            .ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObject(Invoice invoice)
    {
        await invoiceNoSqlBroker
            .CreateInvoiceAsync(invoice)
            .ConfigureAwait(false);

        var createdInvoice = await invoiceNoSqlBroker
            .ReadInvoiceAsync(invoice.id)
            .ConfigureAwait(false);
        return createdInvoice;
    }
}
