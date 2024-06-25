namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.EntityFrameworkCore;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public partial class InvoiceNoSqlBroker
{
	/// <inheritdoc/>
	public async ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
		return await InsertAsync(invoice).ConfigureAwait(false);
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceAsync));

		// dotnet/efcore#16920 - EF Core Cosmos DB provider does not support Include/ThenInclude.
		var invoice = await SelectAsync<Invoice>(invoiceIdentifier, userIdentifier).ConfigureAwait(false);
		await Entry(invoice!).Reference(i => i.Merchant).LoadAsync().ConfigureAwait(false);
		return invoice!;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoicesAsync));

		// dotnet/efcore#16920 - EF Core Cosmos DB provider does not support Include/ThenInclude.
		var invoices = await SelectAll<Invoice>().ToListAsync().ConfigureAwait(false);
		invoices = invoices.FindAll(i => i.UserIdentifier == userIdentifier);
		foreach (var invoice in invoices)
			await Entry(invoice).Reference(i => i.Merchant).LoadAsync().ConfigureAwait(false);

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
