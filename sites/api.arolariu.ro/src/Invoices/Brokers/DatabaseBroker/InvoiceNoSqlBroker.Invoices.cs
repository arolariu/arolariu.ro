namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.Azure.Cosmos;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public partial class InvoiceNoSqlBroker
{
	/// <inheritdoc/>
	public async ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");
		var response = await container.CreateItemAsync(invoice).ConfigureAwait(false);

		ArgumentNullException.ThrowIfNull(invoice);

		// TODO: understand if we save merchant info here, or we make another call to createMerchant.
		return response.Resource;
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");

		var partitionKey = new PartitionKey(userIdentifier.ToString());
		var response = await container.ReadItemAsync<Invoice>(invoiceIdentifier.ToString(), partitionKey).ConfigureAwait(false);

		var invoice = response.Resource;
		return invoice;
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");

		// We do not have a partition key, so we perform a greedy search.
		var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @invoiceIdentifier")
			.WithParameter("@invoiceIdentifier", invoiceIdentifier);

		var iterator = container.GetItemQueryIterator<Invoice>(query);
		var response = await iterator.ReadNextAsync().ConfigureAwait(false);

		var invoice = response.FirstOrDefault();
		ArgumentNullException.ThrowIfNull(invoice);
		return invoice;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync()
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoicesAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");

		// We do not have a partition key, so we perform a greedy search.
		var query = new QueryDefinition("SELECT * FROM c");

		var invoices = new List<Invoice>();
		var iterator = container.GetItemQueryIterator<Invoice>(query);
		while (iterator.HasMoreResults)
		{
			var response = await iterator.ReadNextAsync().ConfigureAwait(false);
			invoices.AddRange(response.ToList());
		}

		return invoices;
	}

	/// <inheritdoc/>
	public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoicesAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");
		var partitionKey = new PartitionKey(userIdentifier.ToString());

		var query = new QueryDefinition("SELECT * FROM c WHERE c.UserIdentifier = @userIdentifier")
			.WithParameter("@userIdentifier", userIdentifier);

		var invoices = new List<Invoice>();
		var iterator = container.GetItemQueryIterator<Invoice>(query, requestOptions: new QueryRequestOptions { PartitionKey = partitionKey });

		while (iterator.HasMoreResults)
		{
			var response = await iterator.ReadNextAsync().ConfigureAwait(false);
			invoices.AddRange(response.ToList());
		}

		return invoices;
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> UpdateInvoiceAsync(Guid invoiceIdentifier, Invoice updatedInvoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceAsync));
		var currentInvoice = await ReadInvoiceAsync(invoiceIdentifier).ConfigureAwait(false);

		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");

		var invoiceKey = invoiceIdentifier.ToString();
		var partitionKey = new PartitionKey(currentInvoice.UserIdentifier.ToString());

		var response = await container.ReplaceItemAsync(updatedInvoice, invoiceKey, partitionKey).ConfigureAwait(false);

		var invoice = response.Resource;
		return invoice;
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var invoicesContainer = database.GetContainer("invoices");
		var merchantContainer = database.GetContainer("merchants");

		var invoiceKey = currentInvoice?.id.ToString();
		var partitionKeyForInvoice = new PartitionKey(currentInvoice?.UserIdentifier.ToString());
		var response = await invoicesContainer.ReplaceItemAsync(updatedInvoice, invoiceKey, partitionKeyForInvoice).ConfigureAwait(false);

		var invoice = response.Resource;
		return invoice;
	}

	/// <inheritdoc/>
	public async ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");

		// We do not have a partition key, so we perform a greedy search.
		var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @invoiceIdentifier")
			.WithParameter("@invoiceIdentifier", invoiceIdentifier);

		var iterator = container.GetItemQueryIterator<Invoice>(query);
		var response = await iterator.ReadNextAsync().ConfigureAwait(false);
		var invoice = response.Resource.FirstOrDefault();

		if (invoice is not null)
		{
			invoice.SoftDelete();

			// Mark the invoice products as soft-deleted.
			foreach (var product in invoice.Items)
			{
				product.Metadata = product.Metadata with { IsSoftDeleted = true };
			}

			// Update the invoice and the products.
			var invoiceKey = invoice.id.ToString();
			var partitionKey = new PartitionKey(invoice.UserIdentifier.ToString());
			await container.ReplaceItemAsync(invoice, invoiceKey, partitionKey).ConfigureAwait(false);
		}
	}

	/// <inheritdoc/>
	public async ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync));
		var database = CosmosClient.GetDatabase("arolariu");
		var container = database.GetContainer("invoices");
		var partitionKey = new PartitionKey(userIdentifier.ToString());

		// Mark the invoice as soft-deleted.
		var invoiceResponse = await container.ReadItemAsync<Invoice>(invoiceIdentifier.ToString(), partitionKey).ConfigureAwait(false);
		var invoice = invoiceResponse.Resource;
		invoice.SoftDelete();

		// Mark the invoice products as soft-deleted.
		foreach (var product in invoice.Items)
		{
			product.Metadata = product.Metadata with { IsSoftDeleted = true };
		}

		// Update the invoice and the products.
		await container.ReplaceItemAsync(invoice, invoice.id.ToString(), partitionKey).ConfigureAwait(false);
	}
}
