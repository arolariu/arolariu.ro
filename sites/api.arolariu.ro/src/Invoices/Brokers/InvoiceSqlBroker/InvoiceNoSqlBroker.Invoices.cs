using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using System.Collections.Generic;
using arolariu.Backend.Domain.Invoices.DTOs;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;

public partial class InvoiceNoSqlBroker
{
    /// <inheritdoc/>
    public async ValueTask<Invoice> CreateInvoiceAsync(CreateInvoiceDto invoiceDto)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
        var invoice = invoiceDto.ToInvoice();
        return await InsertAsync(invoice).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceAsync));
        // TODO: SelectAsync uses FindAsync which uses only 1 entity tracker... need to change.
        var invoice = await SelectAsync<Invoice>(invoiceIdentifier, userIdentifier).ConfigureAwait(false);
        return invoice!;
    }

        /// <inheritdoc/>
    public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync()
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoicesAsync));
        // TODO: SelectAll uses the DbSet of the given entity.. which uses only 1 entity tracker... need to change.
        var invoices = await SelectAll<Invoice>().ToListAsync().ConfigureAwait(false);
        return invoices;
    }

    /// <inheritdoc/>
    public async ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceAsync));
        // TODO.
        return await UpdateAsync(currentInvoice!).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync));
        var invoice = await ReadInvoiceAsync(invoiceIdentifier, userIdentifier).ConfigureAwait(false);
        await DeleteAsync(invoice!).ConfigureAwait(false);
    }
}
