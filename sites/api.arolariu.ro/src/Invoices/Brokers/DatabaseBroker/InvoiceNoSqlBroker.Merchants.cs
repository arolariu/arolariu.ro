namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.Azure.Cosmos;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


public partial class InvoiceNoSqlBroker
{
	/// <inheritdoc/>
	public async ValueTask<Merchant> CreateMerchantAsync(Merchant merchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantAsync));
		var database = CosmosClient.GetDatabase("primary");
		var container = database.GetContainer("merchants");
		var response = await container
			.CreateItemAsync(merchant)
			.ConfigureAwait(false);

		var insertedMerchant = response.Resource;
		return insertedMerchant;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantAsync));
		var database = CosmosClient.GetDatabase("primary");
		var container = database.GetContainer("merchants");

		// We don't have a partition key for the merchant, only the id, so we perform a greedy query
		var query = new QueryDefinition($"SELECT * FROM c WHERE c.id = @merchantIdentifier")
			.WithParameter("@merchantIdentifier", merchantIdentifier);

		var iterator = container.GetItemQueryIterator<Merchant>(query);
		var response = await iterator.ReadNextAsync().ConfigureAwait(false);

		var merchant = response.Resource.Any() ? response.Resource.First() : null;
		if (merchant is not null && merchant.IsSoftDeleted) throw new InvalidOperationException($"The merchant with identifier {merchantIdentifier} has been deleted.");
		return merchant;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync()
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
		var database = CosmosClient.GetDatabase("primary");
		var container = database.GetContainer("merchants");

		var merchantList = new List<Merchant>();
		var query = new QueryDefinition("SELECT * FROM c");
		var iterator = container.GetItemQueryIterator<Merchant>(query);

		while (iterator.HasMoreResults)
		{
			var response = await iterator.ReadNextAsync().ConfigureAwait(false);
			merchantList.AddRange(response);
		}

		var filteredMerchants = merchantList.Where(merchant => merchant.IsSoftDeleted == false);
		return filteredMerchants;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
		var database = CosmosClient.GetDatabase("primary");
		var container = database.GetContainer("merchants");
		var merchantList = new List<Merchant>();

		// We have the partition key for the merchant, so we can perform a targeted query.
		var query = new QueryDefinition($"SELECT * FROM c WHERE c.parentCompanyId = @parentCompanyId")
			.WithParameter("@parentCompanyId", parentCompanyId);

		var iterator = container.GetItemQueryIterator<Merchant>(query);
		while (iterator.HasMoreResults)
		{
			var response = await iterator.ReadNextAsync().ConfigureAwait(false);
			merchantList.AddRange(response);
		}

		var filteredMerchants = merchantList.Where(merchant => merchant.IsSoftDeleted == false);
		return filteredMerchants;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> UpdateMerchantAsync(Guid merchantIdentifier, Merchant updatedMerchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
		var database = CosmosClient.GetDatabase("primary");
		var container = database.GetContainer("merchants");

		var merchant = await ReadMerchantAsync(merchantIdentifier).ConfigureAwait(false);
		var partitionKey = new PartitionKey(merchant?.ParentCompanyId.ToString());

		var response = await container
			.ReplaceItemAsync(updatedMerchant, merchantIdentifier.ToString(), partitionKey)
			.ConfigureAwait(false);

		var newMerchant = response.Resource;
		return newMerchant;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
		var database = CosmosClient.GetDatabase("primary");
		var container = database.GetContainer("merchants");

		var partitionKey = new PartitionKey(currentMerchant?.ParentCompanyId.ToString());
		var response = await container
			.UpsertItemAsync(updatedMerchant, partitionKey)
			.ConfigureAwait(false);

		var newMerchant = response.Resource;
		return newMerchant;
	}

	/// <inheritdoc/>
	public async ValueTask DeleteMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync));
		var database = CosmosClient.GetDatabase("primary");
		var container = database.GetContainer("merchants");

		// We do not have a partition key for the merchant, so we perform a greedy search.
		var query = new QueryDefinition($"SELECT * FROM c WHERE c.id = @merchantIdentifier")
			.WithParameter("@merchantIdentifier", merchantIdentifier);

		var iterator = container.GetItemQueryIterator<Merchant>(query);
		var response = await iterator.ReadNextAsync().ConfigureAwait(false);

		var merchant = response.Resource.Any() ? response.Resource.First() : null;
		if (merchant is not null)
		{
			merchant.SoftDelete();

			var merchantKey = merchant.id.ToString();
			var partitionKey = new PartitionKey(merchant.ParentCompanyId.ToString());

			await container
				.ReplaceItemAsync(merchant, merchantKey, partitionKey)
				.ConfigureAwait(false);
		}
	}
}
