using arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

/// <summary>
/// The Invoice Storage foundation service.
/// </summary>
public partial class InvoiceStorageFoundationService : IInvoiceStorageFoundationService
{
    private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="invoiceNoSqlBroker"></param>
    public InvoiceStorageFoundationService(
        IInvoiceNoSqlBroker invoiceNoSqlBroker)
    {
        ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
        this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    }

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
        var invoice = await invoiceNoSqlBroker
            .ReadInvoiceAsync(identifier)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects() =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
        var invoices = await invoiceNoSqlBroker
            .ReadInvoicesAsync()
            .ConfigureAwait(false);

        return invoices;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> UpdateInvoiceObject(Invoice currentInvoice, Invoice updatedInvoice) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
        var invoice = await invoiceNoSqlBroker
            .UpdateInvoiceAsync(currentInvoice, updatedInvoice)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task DeleteInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
        await invoiceNoSqlBroker.DeleteInvoiceAsync(identifier).ConfigureAwait(false);
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObject(CreateInvoiceDto invoiceDto) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
        var invoice = await invoiceNoSqlBroker.CreateInvoiceAsync(invoiceDto).ConfigureAwait(false);
        return invoice;
    }).ConfigureAwait(false);
}
