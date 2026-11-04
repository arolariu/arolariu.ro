namespace LocalDevelopment.Data.Cosmos;

using Microsoft.Azure.Cosmos;

/// <summary>Clears user databases and restores the local invoice container contracts.</summary>
/// <param name="client">The caller-owned client whose local target has already been authorized.</param>
public sealed class LocalCosmosDataResetter(CosmosClient client)
{
  /// <summary>Deletes every user database from the already-authorized local target.</summary>
  /// <param name="cancellationToken">Cancels enumeration or deletion between resources.</param>
  /// <returns>A task that completes after all enumerated databases have been removed.</returns>
  public async Task ClearAsync(CancellationToken cancellationToken)
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
  /// <param name="cancellationToken">Cancels provisioning.</param>
  /// <returns>A task that completes after the prerequisites have been ensured.</returns>
  public async Task EnsureScenarioContainersAsync(CancellationToken cancellationToken) =>
    await CosmosProvisioning.EnsureInvoiceContainersAsync(client, cancellationToken).ConfigureAwait(false);
}
