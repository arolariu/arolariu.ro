namespace LocalDevelopment.Bootstrap;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.Azure.Cosmos;

internal interface ILocalCosmosResetter
{
  Task ClearAsync(CancellationToken cancellationToken);

  Task WriteAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken);
}

/// <summary>
/// Clears and repopulates the local invoice-domain Cosmos containers.
/// </summary>
internal sealed class LocalCosmosResetter(
  CosmosClient cosmosClient) : ILocalCosmosResetter
{
  private const string DatabaseName = "primary";
  private const string InvoicesContainerName = "invoices";
  private const string MerchantsContainerName = "merchants";

  public async Task ClearAsync(CancellationToken cancellationToken)
  {
    Database database = cosmosClient.GetDatabase(DatabaseName);
    await ClearContainerAsync(
      database.GetContainer(InvoicesContainerName),
      "UserIdentifier",
      cancellationToken).ConfigureAwait(false);
    await ClearContainerAsync(
      database.GetContainer(MerchantsContainerName),
      "ParentCompanyId",
      cancellationToken).ConfigureAwait(false);
  }

  public async Task WriteAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scenario);

    Database database = cosmosClient.GetDatabase(DatabaseName);
    Container merchants = database.GetContainer(MerchantsContainerName);
    Container invoices = database.GetContainer(InvoicesContainerName);

    foreach (Merchant merchant in scenario.Merchants)
    {
      await merchants.CreateItemAsync(
        merchant,
        new PartitionKey(merchant.ParentCompanyId.ToString()),
        cancellationToken: cancellationToken).ConfigureAwait(false);
    }

    foreach (Invoice invoice in scenario.Invoices)
    {
      await invoices.CreateItemAsync(
        invoice,
        new PartitionKey(invoice.UserIdentifier.ToString()),
        cancellationToken: cancellationToken).ConfigureAwait(false);
    }
  }

  private static async Task ClearContainerAsync(
    Container container,
    string partitionProperty,
    CancellationToken cancellationToken)
  {
    QueryDefinition query = new(
      $"SELECT c.id, c.{partitionProperty} AS partitionKey FROM c");
    using FeedIterator<StoredDocumentReference> iterator =
      container.GetItemQueryIterator<StoredDocumentReference>(query);

    while (iterator.HasMoreResults)
    {
      FeedResponse<StoredDocumentReference> response =
        await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);

      foreach (StoredDocumentReference document in response)
      {
        await container.DeleteItemAsync<object>(
          document.Id,
          new PartitionKey(document.PartitionKey),
          cancellationToken: cancellationToken).ConfigureAwait(false);
      }
    }
  }

  private sealed record StoredDocumentReference(
    string Id,
    string PartitionKey);
}
