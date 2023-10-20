using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Entities.Invoices;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Orchestration;

/// <summary>
/// The invoice orchestration service interface represents the orchestration service for the invoice domain.
/// </summary>
public class InvoiceOrchestrationService : IInvoiceOrchestrationService
{
    private readonly IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService;
    private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="invoiceAnalysisFoundationService"></param>
    /// <param name="invoiceStorageFoundationService"></param>
    public InvoiceOrchestrationService(
        IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService,
        IInvoiceStorageFoundationService invoiceStorageFoundationService)
    {
        this.invoiceAnalysisFoundationService = invoiceAnalysisFoundationService;
        this.invoiceStorageFoundationService = invoiceStorageFoundationService;
    }


    /// <inheritdoc/>
    public async Task AnalyzeInvoiceWithOptions(Guid invoiceIdentifier, InvoiceAnalysisOptionsDto options)
    {
        var invoice = await ReadInvoiceObject(invoiceIdentifier).ConfigureAwait(false);
        var updatedInvoice = await invoiceAnalysisFoundationService
            .AnalyzeInvoiceWithOptions(invoice, options)
            .ConfigureAwait(false);

        await UpdateInvoiceObject(updatedInvoice).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObjectFromDto(CreateInvoiceDto invoiceDto)
    {
        var invoice = await invoiceStorageFoundationService
            .ConvertDtoToEntity(invoiceDto)
            .ConfigureAwait(false);

        await invoiceStorageFoundationService
            .CreateInvoiceObject(invoice)
            .ConfigureAwait(false);

        return invoice;
    }

    /// <inheritdoc/>
    public async Task DeleteInvoiceObject(Guid identifier)
    {
        var invoice = await ReadInvoiceObject(identifier).ConfigureAwait(false);
        await invoiceStorageFoundationService
            .DeleteInvoiceObject(invoice.id)
            .ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects()
    {
        var invoices = await invoiceStorageFoundationService
            .ReadAllInvoiceObjects()
            .ConfigureAwait(false);

        return invoices;
    }

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier)
    {
        var invoice = await invoiceStorageFoundationService.ReadInvoiceObject(identifier).ConfigureAwait(false);
        return invoice;
    }

    /// <inheritdoc/>
    public async Task UpdateInvoiceObject(Invoice invoice)
    {
        var updatedInvoice = invoice with { LastModifiedDate = DateTime.UtcNow };
        await invoiceStorageFoundationService.UpdateInvoiceObject(updatedInvoice).ConfigureAwait(false);
    }
}
