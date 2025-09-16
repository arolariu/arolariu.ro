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

	#region Create Merchant API
	/// <inheritdoc/>
	public async Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));
		await merchantStorage
			.CreateMerchantObject(merchant, parentCompanyId)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Delete Merchant API
	/// <inheritdoc/>
	public async Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));
		await merchantStorage
			.DeleteMerchantObject(identifier, parentCompanyId)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Read Merchants API
	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));
		var merchants = await merchantStorage
			.ReadAllMerchantObjects(parentCompanyId)
			.ConfigureAwait(false);
		return merchants;
	}).ConfigureAwait(false);
	#endregion

	#region Read Merchant API
	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));
		var merchant = await merchantStorage
			.ReadMerchantObject(identifier, parentCompanyId)
			.ConfigureAwait(false);
		return merchant;
	}).ConfigureAwait(false);
	#endregion

	#region Update Merchant API
	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
		var newMerchant = await merchantStorage
			.UpdateMerchantObject(updatedMerchant, merchantIdentifier, parentCompanyId)
			.ConfigureAwait(false);
		return newMerchant;
	}).ConfigureAwait(false);
	#endregion
}
