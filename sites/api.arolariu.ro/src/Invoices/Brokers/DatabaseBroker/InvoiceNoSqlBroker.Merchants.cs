namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.EntityFrameworkCore;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


public partial class InvoiceNoSqlBroker
{
	/// <inheritdoc/>
	public async ValueTask<Merchant> CreateMerchantAsync(Merchant merchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantAsync));
		await MerchantContext.AddAsync(merchant).ConfigureAwait(false);
		await SaveChangesAsync().ConfigureAwait(false);
		return merchant;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> ReadMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantAsync));
		var merchant = await MerchantContext.FindAsync(merchantIdentifier)
													.ConfigureAwait(false);

		return merchant!;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync()
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
		var merchants = await MerchantContext.ToListAsync()
											.ConfigureAwait(false);

		return merchants;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
		MerchantContext.Update(updatedMerchant);
		await SaveChangesAsync().ConfigureAwait(false);
		return updatedMerchant;
	}

	/// <inheritdoc/>
	public async ValueTask DeleteMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync));
		var merchant = await MerchantContext.FindAsync(merchantIdentifier)
													.ConfigureAwait(false);
		MerchantContext.Remove(merchant!);
		await SaveChangesAsync().ConfigureAwait(false);
	}
}
