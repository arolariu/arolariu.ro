namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.EntityFrameworkCore;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public partial class InvoiceNoSqlBroker
{
	/// <inheritdoc/>
	public async ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
		await InvoicesContext.AddAsync(invoice).ConfigureAwait(false);
		await SaveChangesAsync().ConfigureAwait(false);
		return invoice;
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceAsync));
		var invoice = await InvoicesContext.FindAsync(invoiceIdentifier, userIdentifier)
										.ConfigureAwait(false);
		return invoice!;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoicesAsync));
		var invoices = await InvoicesContext
										.Where(i => i.UserIdentifier == userIdentifier)
										.ToListAsync()
										.ConfigureAwait(false);
		return invoices;
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceAsync));
		InvoicesContext.Update(updatedInvoice);
		await SaveChangesAsync().ConfigureAwait(false);
		return updatedInvoice;
	}

	/// <inheritdoc/>
	public async ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync));
		var invoice = await InvoicesContext.FindAsync(invoiceIdentifier, userIdentifier)
													.ConfigureAwait(false);
		InvoicesContext.Remove(invoice!);
		await SaveChangesAsync().ConfigureAwait(false);
	}
}
