namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


/// <summary>
/// Class that implements the merchant storage foundation service.
/// </summary>
public partial class MerchantStorageFoundationService : IMerchantStorageFoundationService
{
	private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;
	private readonly ILogger<IMerchantStorageFoundationService> logger;

	/// <summary>
	/// Public constructor.
	/// </summary>
	/// <param name="invoiceNoSqlBroker"></param>
	/// <param name="loggerFactory"></param>
	public MerchantStorageFoundationService(
		IInvoiceNoSqlBroker invoiceNoSqlBroker,
		ILoggerFactory loggerFactory)
	{
		ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
		this.invoiceNoSqlBroker = invoiceNoSqlBroker;
		this.logger = loggerFactory.CreateLogger<IMerchantStorageFoundationService>();
	}

	/// <inheritdoc/>
	public async Task<Merchant> CreateMerchantObject(Merchant merchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));

		ValidateMerchantIdentifierIsSet(merchant.id);

		await invoiceNoSqlBroker.CreateMerchantAsync(merchant).ConfigureAwait(false);
		var retrievedMerchant = await invoiceNoSqlBroker
				.ReadMerchantAsync(merchant.id)
				.ConfigureAwait(false);

		return retrievedMerchant!;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task DeleteMerchantObject(Guid identifier, Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));

		ValidateMerchantIdentifierIsSet(identifier);
		ValidateParentCompanyIdentifierIsSet(parentCompanyId);

		await invoiceNoSqlBroker.DeleteMerchantAsync(identifier).ConfigureAwait(false);
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task DeleteMerchantObject(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));

		ValidateMerchantIdentifierIsSet(identifier);

		await invoiceNoSqlBroker.DeleteMerchantAsync(identifier).ConfigureAwait(false);
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));
		var merchants = await invoiceNoSqlBroker.ReadMerchantsAsync(parentCompanyId).ConfigureAwait(false);

		return merchants;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects() =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));
		var merchants = await invoiceNoSqlBroker.ReadMerchantsAsync().ConfigureAwait(false);

		return merchants;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchantObject(Guid identifier, Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));

		ValidateMerchantIdentifierIsSet(identifier);
		ValidateParentCompanyIdentifierIsSet(parentCompanyId);

		var merchant = await invoiceNoSqlBroker.ReadMerchantAsync(identifier).ConfigureAwait(false);

		return merchant!;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchantObject(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));

		ValidateMerchantIdentifierIsSet(identifier);

		var merchant = await invoiceNoSqlBroker.ReadMerchantAsync(identifier).ConfigureAwait(false);
		return merchant!;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchantObject(Merchant currentMerchant, Merchant updatedMerchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));

		var merchant = await invoiceNoSqlBroker
			.UpdateMerchantAsync(currentMerchant, updatedMerchant)
			.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchantObject(Guid merchantIdentifier, Merchant updatedMerchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
		var currentMerchant = await invoiceNoSqlBroker.ReadMerchantAsync(merchantIdentifier).ConfigureAwait(false);
		ArgumentNullException.ThrowIfNull(currentMerchant);

		var newMerchant = await invoiceNoSqlBroker
			.UpdateMerchantAsync(currentMerchant, updatedMerchant)
			.ConfigureAwait(false);

		return newMerchant;
	}).ConfigureAwait(false);
}
