namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.EntityFrameworkCore;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


public partial class InvoiceNoSqlBroker
{
	/// <inheritdoc/>
	public async ValueTask<Merchant> CreateMerchantAsync(Merchant merchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantAsync));
		return await InsertAsync(merchant).ConfigureAwait(false);
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> ReadMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantAsync));
		var merchant = await SelectAsync<Merchant>(merchantIdentifier)
									.ConfigureAwait(false);

		return merchant!;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync()
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
		var merchants = await SelectAll<Merchant>().ToListAsync()
									.ConfigureAwait(false);

		return merchants;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
		var merchant = await UpdateAsync(currentMerchant).ConfigureAwait(false);
		return merchant;
	}

	/// <inheritdoc/>
	public async ValueTask DeleteMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync));
		var merchant = await ReadMerchantAsync(merchantIdentifier).ConfigureAwait(false);
		await DeleteAsync(merchant).ConfigureAwait(false);
	}
}
