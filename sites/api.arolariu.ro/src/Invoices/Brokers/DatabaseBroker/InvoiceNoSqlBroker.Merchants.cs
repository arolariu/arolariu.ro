namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
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
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("merchants");
		var response = await container.CreateItemAsync(merchant).ConfigureAwait(false);
		return response.Resource;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("merchants");

		// We don't have a partition key for the merchant, only the id
		// We need to query the database to find the merchant.
		var query = new QueryDefinition($"SELECT * FROM c WHERE c.id = '{merchantIdentifier}'");
		var iterator = container.GetItemQueryIterator<Merchant>(query);
		var response = await iterator.ReadNextAsync().ConfigureAwait(false);

		if (response.StatusCode == HttpStatusCode.NotFound)
		{
			return null;
		}
		else
		{
			return response.First();
		}
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync()
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("merchants");

		var merchantList = new List<Merchant>();
		var query = new QueryDefinition("SELECT * FROM c");
		var iterator = container.GetItemQueryIterator<Merchant>(query);

		while (iterator.HasMoreResults)
		{
			var response = await iterator.ReadNextAsync().ConfigureAwait(false);
			merchantList.AddRange(response);
		}

		return merchantList;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("merchants");

		var merchantList = new List<Merchant>();
		var query = new QueryDefinition($"SELECT * FROM c WHERE c.parentCompanyId = '{parentCompanyId}'");
		var iterator = container.GetItemQueryIterator<Merchant>(query);

		while (iterator.HasMoreResults)
		{
			var response = await iterator.ReadNextAsync().ConfigureAwait(false);
			merchantList.AddRange(response);
		}

		return merchantList;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> UpdateMerchantAsync(Guid merchantIdentifier, Merchant updatedMerchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("merchants");

		var merchant = await ReadMerchantAsync(merchantIdentifier).ConfigureAwait(false);
		var partitionKey = new PartitionKey(merchant?.ParentCompanyId.ToString());

		var response = await container.ReplaceItemAsync(updatedMerchant, merchantIdentifier.ToString(), partitionKey).ConfigureAwait(false);

		var newMerchant = response.Resource;
		return newMerchant;
	}

	/// <inheritdoc/>
	public async ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("merchants");

		var partitionKey = new PartitionKey(currentMerchant?.ParentCompanyId.ToString());
		var response = await container.UpsertItemAsync(updatedMerchant, partitionKey).ConfigureAwait(false);

		var newMerchant = response.Resource;
		return newMerchant;
	}

	/// <inheritdoc/>
	public async ValueTask DeleteMerchantAsync(Guid merchantIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("merchants");

		// We do not have a partition key for the merchant, only the id.
		// We need to query the database to find the merchant.
		var query = new QueryDefinition($"SELECT * FROM c WHERE c.id = '{merchantIdentifier}'");
		var iterator = container.GetItemQueryIterator<Merchant>(query);
		var response = await iterator.ReadNextAsync().ConfigureAwait(false);

		if (response.StatusCode == HttpStatusCode.NotFound)
		{
			return;
		}

		var merchant = response.First();
		var partitionKey = new PartitionKey(merchant.ParentCompanyId.ToString());
		await container.DeleteItemAsync<Merchant>(merchant.id.ToString(), partitionKey).ConfigureAwait(false);
	}
}
