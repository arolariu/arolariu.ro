namespace AppHost.Infrastructure.Cosmos;

using Microsoft.Azure.Cosmos;

/// <summary>Clears user databases and restores the local invoice container contracts.</summary>
internal sealed class LocalCosmosDataResetter(CosmosClient client)
{
  internal async Task ClearAsync(CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    var names = new List<string>();
    using FeedIterator<DatabaseProperties> databases = client.GetDatabaseQueryIterator<DatabaseProperties>();
    while (databases.HasMoreResults)
    {
      FeedResponse<DatabaseProperties> page = await databases.ReadNextAsync(cancellationToken).ConfigureAwait(false);
      names.AddRange(page.Select(database => database.Id));
    }
    foreach (string name in names)
    {
      cancellationToken.ThrowIfCancellationRequested();
      try { await client.GetDatabase(name).DeleteAsync(cancellationToken: cancellationToken).ConfigureAwait(false); }
      catch (CosmosException exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound) { }
    }
  }

  internal async Task EnsureScenarioContainersAsync(CancellationToken cancellationToken)
  {
    Database database = (await client.CreateDatabaseIfNotExistsAsync(
      Constants.CosmosDatabaseName, cancellationToken: cancellationToken).ConfigureAwait(false)).Database;
    await database.CreateContainerIfNotExistsAsync(Constants.CosmosInvoicesContainer, Constants.CosmosInvoicesPartitionKey,
      cancellationToken: cancellationToken).ConfigureAwait(false);
    await database.CreateContainerIfNotExistsAsync(Constants.CosmosMerchantsContainer, Constants.CosmosMerchantsPartitionKey,
      cancellationToken: cancellationToken).ConfigureAwait(false);
  }
}
