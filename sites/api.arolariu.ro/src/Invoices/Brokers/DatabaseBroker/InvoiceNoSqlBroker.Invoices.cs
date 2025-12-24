namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.Azure.Cosmos;

using arolariu.Backend.Common.Telemetry.Tracing;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public partial class InvoiceNoSqlBroker
{
  /// <inheritdoc/>
  public async ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice)
  {
    ArgumentNullException.ThrowIfNull(invoice);

    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "invoices", "create", invoice.UserIdentifier.ToString())
      .SetInvoiceContext(invoice.id, invoice.UserIdentifier);

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("invoices");
    var response = await container
      .CreateItemAsync(invoice)
      .ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    activity?.RecordSuccess();

    var insertedInvoice = response.Resource;
    return insertedInvoice;
  }

  /// <inheritdoc/>
  public async ValueTask<Invoice?> ReadInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier = null)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetInvoiceContext(invoiceIdentifier, userIdentifier);

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("invoices");

    if (userIdentifier.HasValue)
    {
      if (activity is not null)
      {
        activity.SetCosmosDbContext("primary", "invoices", "read", userIdentifier.ToString());
        activity.SetTag("db.query.type", "point_read");
      }

      // We have the partition key for the merchant, so we can perform a targeted query (point read).
      var partitionKey = new PartitionKey(userIdentifier.ToString());
      var response = await container.ReadItemAsync<Invoice>(invoiceIdentifier.ToString(), partitionKey).ConfigureAwait(false);

      activity?.SetCosmosDbRequestCharge(response.RequestCharge);

      var invoice = response.Resource;
      if (invoice is not null && invoice.IsSoftDeleted)
      {
        activity?.AddCustomEvent("invoice.soft_deleted", new Dictionary<string, object?> { ["invoice.id"] = invoiceIdentifier.ToString() });
        throw new InvalidOperationException($"The invoice with identifier {invoiceIdentifier} does not exist!");
      }

      activity?.RecordSuccess();
      return invoice;
    }
    else
    {
      if (activity is not null)
      {
        activity.SetCosmosDbContext("primary", "invoices", "query");
        activity.SetTag("db.query.type", "cross_partition");
        activity.SetDbStatement("SELECT * FROM c WHERE c.id = @invoiceIdentifier");
      }

      // We do not have a partition key, so we perform a greedy search.
      var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @invoiceIdentifier")
          .WithParameter("@invoiceIdentifier", invoiceIdentifier);

      var iterator = container.GetItemQueryIterator<Invoice>(query);
      var response = await iterator.ReadNextAsync().ConfigureAwait(false);

      activity?.SetCosmosDbRequestCharge(response.RequestCharge);

      var invoice = response.Resource.Any() ? response.Resource.First() : null;
      if (invoice is not null && invoice.IsSoftDeleted)
      {
        activity?.AddCustomEvent("invoice.soft_deleted", new Dictionary<string, object?> { ["invoice.id"] = invoiceIdentifier.ToString() });
        throw new InvalidOperationException($"The invoice with identifier {invoiceIdentifier} has been deleted.");
      }

      activity?.RecordSuccess();
      return invoice;
    }
  }

  /// <inheritdoc/>
  public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoicesAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "invoices", "query", userIdentifier.ToString())
      .SetUserContext(userIdentifier)
      .SetDbStatement("SELECT * FROM c WHERE c.UserIdentifier = @userIdentifier");

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("invoices");
    var partitionKey = new PartitionKey(userIdentifier.ToString());

    var query = new QueryDefinition("SELECT * FROM c WHERE c.UserIdentifier = @userIdentifier")
      .WithParameter("@userIdentifier", userIdentifier);

    var invoices = new List<Invoice>();
    var totalRequestCharge = 0.0;
    var iterator = container.GetItemQueryIterator<Invoice>(query, requestOptions: new QueryRequestOptions { PartitionKey = partitionKey });

    while (iterator.HasMoreResults)
    {
      var response = await iterator.ReadNextAsync().ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;
      invoices.AddRange([.. response]);
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    activity?.SetTag("result.total_count", invoices.Count);

    var filteredInvoices = invoices.Where(invoice => invoice.IsSoftDeleted == false);
    activity?.SetTag("result.filtered_count", filteredInvoices.Count());
    activity?.RecordSuccess();

    return filteredInvoices;
  }

  /// <inheritdoc/>
  public async ValueTask<Invoice> UpdateInvoiceAsync(Guid invoiceIdentifier, Invoice updatedInvoice)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "invoices", "upsert", updatedInvoice?.UserIdentifier.ToString())
      .SetInvoiceContext(invoiceIdentifier, updatedInvoice?.UserIdentifier);

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("invoices");

    var partitionKey = new PartitionKey(updatedInvoice?.UserIdentifier.ToString());
    var response = await container
      .UpsertItemAsync(updatedInvoice, partitionKey)
      .ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    activity?.RecordSuccess();

    var invoice = response.Resource;
    return invoice!;
  }

  /// <inheritdoc/>
  public async ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "invoices", "upsert", updatedInvoice?.UserIdentifier.ToString())
      .SetInvoiceContext(updatedInvoice?.id ?? Guid.Empty, updatedInvoice?.UserIdentifier);

    var database = CosmosClient.GetDatabase("primary");
    var invoicesContainer = database.GetContainer("invoices");

    var partitionKeyForInvoice = new PartitionKey(updatedInvoice?.UserIdentifier.ToString());

    var response = await invoicesContainer
      .UpsertItemAsync(updatedInvoice, partitionKeyForInvoice)
      .ConfigureAwait(false);

    activity?.SetCosmosDbRequestCharge(response.RequestCharge);
    activity?.RecordSuccess();

    var invoice = response.Resource;
    return invoice!;
  }


  /// <inheritdoc/>
  public async ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier = null)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetInvoiceContext(invoiceIdentifier, userIdentifier);

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("invoices");
    var totalRequestCharge = 0.0;

    if (userIdentifier.HasValue)
    {
      if (activity is not null)
      {
        activity.SetCosmosDbContext("primary", "invoices", "soft_delete", userIdentifier.ToString());
        activity.SetTag("db.query.type", "point_read_then_replace");
      }

      // We have the partition key for the merchant, so we can perform a targeted query (point read).
      var partitionKey = new PartitionKey(userIdentifier.ToString());
      var response = await container.ReadItemAsync<Invoice>(invoiceIdentifier.ToString(), partitionKey).ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;

      var invoice = response.Resource;
      if (invoice is not null)
      {
        // Mark the invoice as soft-deleted.
        invoice.SoftDelete();
        activity?.AddCustomEvent("invoice.soft_deleted");

        // Update the invoice and the products.
        var replaceResponse = await container
          .ReplaceItemAsync(invoice, invoice.id.ToString(), partitionKey)
          .ConfigureAwait(false);
        totalRequestCharge += replaceResponse.RequestCharge;
      }
    }
    else
    {
      if (activity is not null)
      {
        activity.SetCosmosDbContext("primary", "invoices", "soft_delete");
        activity.SetTag("db.query.type", "cross_partition_query_then_replace");
        activity.SetDbStatement("SELECT * FROM c WHERE c.id = @invoiceIdentifier");
      }

      // We do not have a partition key, so we perform a greedy search.
      var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @invoiceIdentifier")
          .WithParameter("@invoiceIdentifier", invoiceIdentifier);
      var iterator = container.GetItemQueryIterator<Invoice>(query);
      var response = await iterator.ReadNextAsync().ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;

      var invoice = response.Resource.Any() ? response.Resource.First() : null;
      if (invoice is not null)
      {
        // Mark the invoice as soft-deleted.
        invoice.SoftDelete();
        activity?.AddCustomEvent("invoice.soft_deleted");

        // Update the invoice and the products.
        var partitionKey = new PartitionKey(invoice.UserIdentifier.ToString());
        var replaceResponse = await container
          .ReplaceItemAsync(invoice, invoice.id.ToString(), partitionKey)
          .ConfigureAwait(false);
        totalRequestCharge += replaceResponse.RequestCharge;
      }
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    activity?.RecordSuccess();
  }

  /// <inheritdoc/>
  public async ValueTask DeleteInvoicesAsync(Guid userIdentifier)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoicesAsync));
    activity?
      .SetLayerContext("Broker", nameof(InvoiceNoSqlBroker))
      .SetCosmosDbContext("primary", "invoices", "batch_soft_delete", userIdentifier.ToString())
      .SetUserContext(userIdentifier)
      .SetDbStatement("SELECT * FROM c WHERE c.UserIdentifier = @userIdentifier");

    var database = CosmosClient.GetDatabase("primary");
    var container = database.GetContainer("invoices");
    var partitionKey = new PartitionKey(userIdentifier.ToString());
    var query = new QueryDefinition("SELECT * FROM c WHERE c.UserIdentifier = @userIdentifier")
      .WithParameter("@userIdentifier", userIdentifier);

    var totalRequestCharge = 0.0;
    var deletedCount = 0;
    var iterator = container.GetItemQueryIterator<Invoice>(query, requestOptions: new QueryRequestOptions { PartitionKey = partitionKey });

    while (iterator.HasMoreResults)
    {
      var response = await iterator.ReadNextAsync().ConfigureAwait(false);
      totalRequestCharge += response.RequestCharge;

      foreach (var invoice in response)
      {
        invoice.SoftDelete();
        // Mark the invoice products as soft-deleted.
        foreach (var product in invoice.Items)
        {
          product.Metadata = product.Metadata with { IsSoftDeleted = true };
        }

        // Update the invoice and the products.
        var replaceResponse = await container
          .ReplaceItemAsync(invoice, invoice.id.ToString(), partitionKey)
          .ConfigureAwait(false);
        totalRequestCharge += replaceResponse.RequestCharge;
        deletedCount++;
      }
    }

    activity?.SetCosmosDbRequestCharge(totalRequestCharge);
    activity?.SetTag("batch.deleted_count", deletedCount);
    activity?.RecordSuccess();
  }
}
