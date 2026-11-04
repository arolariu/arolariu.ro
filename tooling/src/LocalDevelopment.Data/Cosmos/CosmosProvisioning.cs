namespace LocalDevelopment.Data.Cosmos;

using Microsoft.Azure.Cosmos;

internal static class CosmosProvisioning
{
  internal static async Task<Database> EnsureInvoiceContainersAsync(CosmosClient client, CancellationToken cancellationToken)
  {
    Database database = (await client.CreateDatabaseIfNotExistsAsync(
      LocalDataContract.CosmosDatabaseName, cancellationToken: cancellationToken).ConfigureAwait(false)).Database;
    await database.CreateContainerIfNotExistsAsync(
      LocalDataContract.CosmosInvoicesContainer, LocalDataContract.CosmosInvoicesPartitionKey,
      cancellationToken: cancellationToken).ConfigureAwait(false);
    await database.CreateContainerIfNotExistsAsync(
      LocalDataContract.CosmosMerchantsContainer, LocalDataContract.CosmosMerchantsPartitionKey,
      cancellationToken: cancellationToken).ConfigureAwait(false);
    return database;
  }
}
