using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoices;
using arolariu.Backend.Core.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Core.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Services.Orchestration;

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
        var invoice = await ReadInvoiceObject(invoiceIdentifier);
        var updatedInvoice = await invoiceAnalysisFoundationService.AnalyzeInvoiceWithOptions(invoice, options);
        await UpdateInvoiceObject(updatedInvoice);
    }

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObjectFromDto(CreateInvoiceDto invoiceDto)
    {
        var invoice = await invoiceStorageFoundationService.ConvertDtoToEntity(invoiceDto);
        await invoiceStorageFoundationService.CreateInvoiceObject(invoice);
        return invoice;
    }

    /// <inheritdoc/>
    public async Task DeleteInvoiceObject(Guid identifier)
    {
        var invoice = await ReadInvoiceObject(identifier);
        await invoiceStorageFoundationService.DeleteInvoiceObject(invoice.id);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects()
    {
        var invoices = await invoiceStorageFoundationService.ReadAllInvoiceObjects();
        return invoices;
    }

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier)
    {
        var invoice = await invoiceStorageFoundationService.ReadInvoiceObject(identifier);
        return invoice;
    }

    /// <inheritdoc/>
    public async Task UpdateInvoiceObject(Invoice invoice)
    {
        var updatedInvoice = invoice with { LastModifiedDate = DateTime.UtcNow };
        await invoiceStorageFoundationService.UpdateInvoiceObject(updatedInvoice);
    }
}
