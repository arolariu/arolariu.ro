using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoicePhotoStorageBroker;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Services.Foundation;

/// <summary>
/// The invoice foundation service.
/// </summary>
/// <typeparam name="T"></typeparam>
public class InvoiceFoundationService<T> : IInvoiceFoundationService
    where T : class
{
    private readonly IInvoiceAnalysisBroker<T> invoiceAnalysisBroker;
    private readonly IInvoiceStorageBroker invoiceStorageBroker;
    private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="invoiceAnalysisBroker"></param>
    /// <param name="invoiceStorageBroker"></param>
    /// <param name="invoiceNoSqlBroker"></param>
    public InvoiceFoundationService(
        IInvoiceAnalysisBroker<T> invoiceAnalysisBroker,
        IInvoiceStorageBroker invoiceStorageBroker,
        IInvoiceNoSqlBroker invoiceNoSqlBroker)
    {
        this.invoiceAnalysisBroker = invoiceAnalysisBroker;
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
    public async Task<Invoice> CreateInvoiceObject(Invoice invoice)
    {
        await invoiceNoSqlBroker.CreateInvoiceAsync(invoice);
        return invoice;
    }


    /// <inheritdoc/>
    public async Task<Invoice> AnalyzeInvoiceObject(Guid identifier)
    {
        var invoice = await invoiceNoSqlBroker.ReadInvoiceAsync(identifier);
        var analyzedInvoice = await invoiceAnalysisBroker.SendInvoiceToAnalysisAsync(invoice);
        var updatedInvoice = await invoiceAnalysisBroker.PopulateInvoiceWithAnalysisResultAsync(invoice, analyzedInvoice);
        await invoiceNoSqlBroker.UpdateInvoiceAsync(updatedInvoice);
        return updatedInvoice;
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


}
