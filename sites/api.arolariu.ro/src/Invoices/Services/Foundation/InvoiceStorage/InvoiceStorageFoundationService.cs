namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

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

	#region Create Invoice Object API
	/// <inheritdoc/>
	public async Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
		ValidateInvoiceInformationIsValid(invoice);

		await invoiceNoSqlBroker
			.CreateInvoiceAsync(invoice)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Read Invoice Object API
	/// <inheritdoc/>
	public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
		ValidateIdentifierIsSet(identifier);

		if (userIdentifier is null)
		{
			logger.LogUserIdentifierNotSetWarning();
			Invoice invoice = await invoiceNoSqlBroker
				.ReadInvoiceAsync(identifier)
				.ConfigureAwait(false);
			return invoice;
		}
		else
		{
			Invoice invoice = await invoiceNoSqlBroker
				.ReadInvoiceAsync(identifier, (Guid)userIdentifier)
				.ConfigureAwait(false);
			return invoice;
		}
	}).ConfigureAwait(false);
	#endregion

	#region Read Invoice Objects API
	/// <inheritdoc/>
	public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
		if (userIdentifier is null)
		{
			logger.LogUserIdentifierNotSetWarning();
			var invoices = await invoiceNoSqlBroker
				.ReadInvoicesAsync()
				.ConfigureAwait(false);
			return invoices;
		}
		else
		{
			var invoices = await invoiceNoSqlBroker
				.ReadInvoicesAsync((Guid)userIdentifier)
				.ConfigureAwait(false);
			return invoices;
		}
	}).ConfigureAwait(false);
	#endregion

	#region Update Invoice Object API
	/// <inheritdoc/>
	public async Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
		ValidateIdentifierIsSet(invoiceIdentifier);

		var newInvoice = await invoiceNoSqlBroker
			.UpdateInvoiceAsync(invoiceIdentifier, updatedInvoice)
			.ConfigureAwait(false);

		return newInvoice!;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Invoice Object API
	/// <inheritdoc/>
	public async Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
		ValidateIdentifierIsSet(identifier);

		if (userIdentifier is null)
		{
			logger.LogUserIdentifierNotSetWarning();
			await invoiceNoSqlBroker
				.DeleteInvoiceAsync(identifier)
				.ConfigureAwait(false);
		}
		else
		{
			await invoiceNoSqlBroker
				.DeleteInvoiceAsync(identifier, (Guid)userIdentifier)
				.ConfigureAwait(false);
		}
	}).ConfigureAwait(false);
	#endregion
}
