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
            .UploadInvoicePhotoToStorage(invoiceDto.InvoiceBase64Photo, invoice.id);

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
        var invoice = await invoiceNoSqlBroker.ReadInvoiceAsync(identifier);
        return invoice;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects()
    {
        var invoices = await invoiceNoSqlBroker.ReadInvoicesAsync();
        return invoices;
    }

    /// <inheritdoc/>
    public async Task UpdateInvoiceObject(Invoice invoice)
    {
        await invoiceNoSqlBroker.UpdateInvoiceAsync(invoice);
    }

    /// <inheritdoc/>
    public async Task DeleteInvoiceObject(Guid identifier)
    {
        await invoiceNoSqlBroker.DeleteInvoiceAsync(identifier);
    }

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObject(Invoice invoice)
    {
        await invoiceNoSqlBroker.CreateInvoiceAsync(invoice);
        var createdInvoice = await invoiceNoSqlBroker.ReadInvoiceAsync(invoice.id);
        return createdInvoice;
    }
}
