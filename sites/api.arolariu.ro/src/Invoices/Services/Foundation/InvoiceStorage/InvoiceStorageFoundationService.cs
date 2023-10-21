using arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;
using arolariu.Backend.Domain.Invoices.Entities.Invoices;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

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
        this.invoiceNoSqlBroker = invoiceNoSqlBroker
            ?? throw new ArgumentNullException(nameof(invoiceNoSqlBroker));
    }

    /// <inheritdoc/>
    public async Task<Invoice> ReadInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        var invoice = await invoiceNoSqlBroker
            .ReadInvoiceAsync(identifier)
            .ConfigureAwait(false);

        return invoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects() =>
    await TryCatchAsync(async () =>
    {
        var invoices = await invoiceNoSqlBroker
            .ReadInvoicesAsync()
            .ConfigureAwait(false);

        return invoices;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> UpdateInvoiceObject(Invoice invoice) =>
    await TryCatchAsync(async () =>
    {
        var updatedInvoice = await invoiceNoSqlBroker
            .UpdateInvoiceAsync(invoice)
            .ConfigureAwait(false);

        return updatedInvoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> DeleteInvoiceObject(Guid identifier) =>
    await TryCatchAsync(async () =>
    {
        var deletedInvoice = await invoiceNoSqlBroker
            .DeleteInvoiceAsync(identifier)
            .ConfigureAwait(false);

        return deletedInvoice;
    }).ConfigureAwait(false);

    /// <inheritdoc/>
    public async Task<Invoice> CreateInvoiceObject(Invoice invoice) =>
    await TryCatchAsync(async () =>
    {
        ArgumentNullException.ThrowIfNull(invoice);

        await invoiceNoSqlBroker
            .CreateInvoiceAsync(invoice)
            .ConfigureAwait(false);

        var createdInvoice = await invoiceNoSqlBroker
            .ReadInvoiceAsync(invoice.id)
            .ConfigureAwait(false);

        return createdInvoice;
    }).ConfigureAwait(false);
}
