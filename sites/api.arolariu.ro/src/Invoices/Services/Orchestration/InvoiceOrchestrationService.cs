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
public partial class InvoiceOrchestrationService : IInvoiceOrchestrationService
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
    public async Task AnalyzeInvoiceWithOptions(Guid invoiceIdentifier, AnalysisOptionsDto options) =>
    await TryCatchAsync(async () =>
    {
        var invoice = await ReadInvoiceObject(invoiceIdentifier).ConfigureAwait(false);
        await invoiceAnalysisFoundationService
            .AnalyzeInvoiceAsync(invoice, options)
            .ConfigureAwait(false);

        await UpdateInvoiceObject(invoice).ConfigureAwait(false);
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> DeleteInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        var invoice = await ReadInvoiceObject(identifier).ConfigureAwait(false);
        var deletedInvoice = await invoiceStorageFoundationService
            .DeleteInvoiceObject(invoice.id)
            .ConfigureAwait(false);

        return deletedInvoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects() =>
    await TryCatchAsync(async () =>
    {
        var invoices = await invoiceStorageFoundationService
            .ReadAllInvoiceObjects()
            .ConfigureAwait(false);

        return invoices;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        var invoice = await invoiceStorageFoundationService
            .ReadInvoiceObject(identifier)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> UpdateInvoiceObject(Invoice invoice) =>
    await TryCatchAsync(async () =>
    {
        ArgumentNullException.ThrowIfNull(invoice);
        var updatedInvoice = await invoiceStorageFoundationService
            .UpdateInvoiceObject(invoice)
            .ConfigureAwait(false);

        return updatedInvoice;
    }).ConfigureAwait(false);
}
