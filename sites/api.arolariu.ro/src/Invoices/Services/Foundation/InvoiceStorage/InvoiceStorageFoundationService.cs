using arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.Extensions.Logging;

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
    private readonly ILogger<IInvoiceStorageFoundationService> logger;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="invoiceNoSqlBroker"></param>
    /// <param name="loggerFactory"></param>
    public InvoiceStorageFoundationService(
        IInvoiceNoSqlBroker invoiceNoSqlBroker,
        ILoggerFactory loggerFactory)
    {
        ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
        this.invoiceNoSqlBroker = invoiceNoSqlBroker;
        this.logger = loggerFactory.CreateLogger<IInvoiceStorageFoundationService>();
    }

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObject(CreateInvoiceDto invoiceDto) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
        ValidateDtoIsValid(invoiceDto);

        var invoice = await invoiceNoSqlBroker.CreateInvoiceAsync(invoiceDto).ConfigureAwait(false);
        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid userIdentifier) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
        ValidateIdentifierIsSet(identifier);
        var invoice = await invoiceNoSqlBroker
            .ReadInvoiceAsync(identifier, userIdentifier)
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
        ValidateInvoiceInformationIsCorrect(currentInvoice);
        ValidateInvoiceInformationIsCorrect(updatedInvoice);
        var invoice = await invoiceNoSqlBroker
            .UpdateInvoiceAsync(currentInvoice, updatedInvoice)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task DeleteInvoiceObject(Guid identifier, Guid userIdentifier) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
        ValidateIdentifierIsSet(identifier);
        await invoiceNoSqlBroker.DeleteInvoiceAsync(identifier, userIdentifier).ConfigureAwait(false);
    }).ConfigureAwait(false);
}
