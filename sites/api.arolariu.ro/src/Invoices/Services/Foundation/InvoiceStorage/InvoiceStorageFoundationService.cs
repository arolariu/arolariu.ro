﻿namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

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

	/// <inheritdoc/>
	public async Task<Invoice> CreateInvoiceObject(Invoice invoice) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
		ValidateInvoiceInformationIsValid(invoice);

		await invoiceNoSqlBroker.CreateInvoiceAsync(invoice).ConfigureAwait(false);
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
	public async Task<Invoice> ReadInvoiceObject(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
		ValidateIdentifierIsSet(identifier);
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
	public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
		var invoices = await invoiceNoSqlBroker
			.ReadInvoicesAsync(userIdentifier)
			.ConfigureAwait(false);

		return invoices;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public Task<Invoice> UpdateInvoiceObject(Guid invoiceIdentifier, Invoice updatedInvoice)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public async Task<Invoice> UpdateInvoiceObject(Invoice currentInvoice, Invoice updatedInvoice) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
		var invoice = await invoiceNoSqlBroker.UpdateInvoiceAsync(currentInvoice, updatedInvoice)
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

	/// <inheritdoc/>
	public Task DeleteInvoiceObject(Guid identifier)
	{
		throw new NotImplementedException();
	}
}
