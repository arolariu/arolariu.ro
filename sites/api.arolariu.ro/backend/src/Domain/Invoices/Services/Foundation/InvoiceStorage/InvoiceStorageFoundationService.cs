using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoicePhotoStorageBroker;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Services.Foundation.InvoiceStorage;

/// <summary>
/// The createdInvoice foundation service.
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
        var invoice = InvoiceMappings.CreateDefaultInvoice();
        var invoicePhotoUri = await invoiceStorageBroker
            .UploadInvoicePhotoToStorage(invoiceDto.InvoiceBase64Photo, invoice.id);


        return invoice with
        {
            AdditionalMetadata = invoiceDto.AdditionalMetadata,
            ImageUri = invoicePhotoUri,
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
