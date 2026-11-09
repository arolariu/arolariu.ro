namespace LocalDevelopment.Data.NoSql;

using Microsoft.Azure.Cosmos;

/// <summary>Clears user databases and restores the local invoice container contracts.</summary>
/// <remarks>The current NoSQL implementation uses Cosmos DB; clients remain caller-owned and already authorized.</remarks>
public static class NoSqlDataProvider
{
  /// <summary>Deletes every user database from the already-authorized local target.</summary>
  /// <param name="client">The caller-owned client whose local target has already been authorized.</param>
  /// <param name="cancellationToken">Cancels enumeration or deletion between resources.</param>
  /// <returns>A task that completes after all enumerated databases have been removed.</returns>
  public static async Task ClearAsync(CosmosClient client, CancellationToken cancellationToken)
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

  /// <summary>Creates the invoice database and its partitioned containers without initializing scenario data.</summary>
  /// <param name="client">The caller-owned client whose local target has already been authorized.</param>
  /// <param name="cancellationToken">Cancels provisioning.</param>
  /// <returns>The database after its invoice and merchant containers have been ensured.</returns>
  public static async Task<Database> EnsureScenarioContainersAsync(CosmosClient client, CancellationToken cancellationToken)
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
