using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.EntityFrameworkCore;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;

/// <summary>
/// The Entity Framework Invoice SQL broker.
/// </summary>
public partial class InvoiceNoSqlBroker(DbContextOptions options) : DbContext(options), IInvoiceNoSqlBroker
{
    /// <summary>
    /// The create invoice method.
    /// </summary>
    /// <param name="invoiceDto"></param>
    /// <returns></returns>
    public async ValueTask<Invoice> CreateInvoiceAsync(CreateInvoiceDto invoiceDto)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
        var invoice = invoiceDto.ToInvoice();
        return await InsertAsync(invoice).ConfigureAwait(false);
    }

    /// <summary>
    /// The read invoice method.
    /// </summary>
    /// <param name="invoiceIdentifier"></param>
    /// <returns></returns>
    public async ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceAsync));
        var invoice = await SelectAsync<Invoice>(invoiceIdentifier).ConfigureAwait(false);
        return invoice!;
    }

    /// <summary>
    /// The read invoices method.
    /// </summary>
    /// <returns></returns>
    public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync()
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoicesAsync));
        var invoices = await SelectAll<Invoice>().ToListAsync().ConfigureAwait(false);
        return invoices;
    }

    /// <summary>
    /// The update invoice method.
    /// </summary>
    /// <param name="currentInvoice"></param>
    /// <param name="updatedInvoice"></param>
    /// <returns></returns>
    public async ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceAsync));
        var newInvoice = currentInvoice?.Update(updatedInvoice);
        return await UpdateAsync(newInvoice!).ConfigureAwait(false);
    }

    /// <summary>
    /// The delete invoice method.
    /// </summary>
    /// <param name="invoiceIdentifier"></param>
    /// <returns></returns>
    public async ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync));
        var invoice = await SelectAsync<Invoice>(invoiceIdentifier).ConfigureAwait(false);
        await DeleteAsync(invoice!).ConfigureAwait(false);
    }
}
