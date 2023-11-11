using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using Microsoft.Extensions.Logging;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


namespace arolariu.Backend.Domain.Invoices.Services.Orchestration;

/// <summary>
/// The invoice orchestration service interface represents the orchestration service for the invoice domain.
/// </summary>
public partial class InvoiceOrchestrationService : IInvoiceOrchestrationService
{
    private readonly IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService;
    private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;
    private readonly ILogger<IInvoiceOrchestrationService> logger;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="invoiceAnalysisFoundationService"></param>
    /// <param name="invoiceStorageFoundationService"></param>
    /// <param name="loggerFactory"></param>
    public InvoiceOrchestrationService(
        IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService,
        IInvoiceStorageFoundationService invoiceStorageFoundationService,
        ILoggerFactory loggerFactory)
    {
        ArgumentNullException.ThrowIfNull(invoiceAnalysisFoundationService);
        ArgumentNullException.ThrowIfNull(invoiceStorageFoundationService);
        this.invoiceAnalysisFoundationService = invoiceAnalysisFoundationService;
        this.invoiceStorageFoundationService = invoiceStorageFoundationService;
        logger = loggerFactory.CreateLogger<IInvoiceOrchestrationService>();
    }

    /// <inheritdoc/>
    public async Task AnalyzeInvoiceWithOptions(Guid invoiceIdentifier, AnalysisOptionsDto options) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceWithOptions));
        var invoice = await ReadInvoiceObject(invoiceIdentifier).ConfigureAwait(false);
        await invoiceAnalysisFoundationService.AnalyzeInvoiceAsync(invoice, options).ConfigureAwait(false);
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObject(CreateInvoiceDto createInvoiceDto) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
        var invoice = await invoiceStorageFoundationService
            .CreateInvoiceObject(createInvoiceDto)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task DeleteInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
        var invoice = await ReadInvoiceObject(identifier).ConfigureAwait(false);
        await invoiceStorageFoundationService.DeleteInvoiceObject(invoice.Id).ConfigureAwait(false);
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects() =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
        var invoices = await invoiceStorageFoundationService
            .ReadAllInvoiceObjects()
            .ConfigureAwait(false);

        return invoices;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
        var invoice = await invoiceStorageFoundationService
            .ReadInvoiceObject(identifier)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> UpdateInvoiceObject(Invoice currentInvoice, Invoice updatedInvoice) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
        var invoice = await invoiceStorageFoundationService
            .UpdateInvoiceObject(currentInvoice, updatedInvoice)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);
}
