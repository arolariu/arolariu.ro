namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


/// <summary>
/// This class represents the merchant orchestration service.
/// </summary>
public partial class MerchantOrchestrationService : IMerchantOrchestrationService
{
	private readonly IMerchantStorageFoundationService merchantStorage;
	private readonly ILogger<IMerchantOrchestrationService> logger;

	/// <summary>
	/// Public constructor.
	/// </summary>
	/// <param name="merchantStorage"></param>
	/// <param name="loggerFactory"></param>
	public MerchantOrchestrationService(
		IMerchantStorageFoundationService merchantStorage,
		ILoggerFactory loggerFactory)
	{
		ArgumentNullException.ThrowIfNull(merchantStorage);
		this.merchantStorage = merchantStorage;
		this.logger = loggerFactory.CreateLogger<IMerchantOrchestrationService>();
	}

	/// <inheritdoc/>
	public async Task<Merchant> CreateMerchantObject(Merchant merchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));
		await merchantStorage.CreateMerchantObject(merchant).ConfigureAwait(false);

		var createdMerchant = await merchantStorage
			.ReadMerchantObject(merchant.id, merchant.ParentCompanyId)
			.ConfigureAwait(false);

		return createdMerchant;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task DeleteMerchantObject(Guid identifier, Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));
		await merchantStorage.DeleteMerchantObject(identifier, parentCompanyId).ConfigureAwait(false);
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task DeleteMerchantObject(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));
		await merchantStorage.DeleteMerchantObject(identifier).ConfigureAwait(false);
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));
		var merchants = await merchantStorage.ReadAllMerchantObjects(parentCompanyId).ConfigureAwait(false);

		return merchants;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects() =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));
		var merchants = await merchantStorage.ReadAllMerchantObjects().ConfigureAwait(false);

		return merchants;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchantObject(Guid identifier, Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));
		var merchant = await merchantStorage.ReadMerchantObject(identifier, parentCompanyId)
														.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchantObject(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));
		var merchant = await merchantStorage.ReadMerchantObject(identifier).ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchantObject(Merchant currentMerchant, Merchant updatedMerchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
		await merchantStorage.UpdateMerchantObject(currentMerchant, updatedMerchant).ConfigureAwait(false);

		var merchant = await merchantStorage.ReadMerchantObject(updatedMerchant.id, updatedMerchant.ParentCompanyId)
														.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchantObject(Guid merchantIdentifier, Merchant updatedMerchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
		var currentMerchant = await merchantStorage.ReadMerchantObject(merchantIdentifier).ConfigureAwait(false);

		var newMerchant = await merchantStorage.UpdateMerchantObject(currentMerchant, updatedMerchant).ConfigureAwait(false);
		return newMerchant;
	}).ConfigureAwait(false);
}
