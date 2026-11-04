namespace LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;

using System.Globalization;
using System.Net;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;

internal interface ILocalCosmosResetter
{
  Task<SeedInitializationState> ReadOrCreateInitializationAsync(
    string manifestVersion,
    DateOnly proposedAnchorUtc,
    CancellationToken cancellationToken);

  Task WriteMissingAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken);

  Task CompleteInitializationAsync(
    SeedInitializationState state,
    CancellationToken cancellationToken);
}

/// <summary>
/// Initializes local invoice data without deleting or overwriting existing documents.
/// </summary>
internal sealed class LocalCosmosResetter(
  CosmosClient cosmosClient) : ILocalCosmosResetter
{
  private const string DatabaseName = "primary";
  private const string InvoicesContainerName = "invoices";
  private const string MerchantsContainerName = "merchants";
  private const string InitializationContainerName = "local-development";
  private const string InitializationId = "invoice-scenario";

  public async Task<SeedInitializationState> ReadOrCreateInitializationAsync(
    string manifestVersion,
    DateOnly proposedAnchorUtc,
    CancellationToken cancellationToken)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(manifestVersion);
    Database database = (await cosmosClient.CreateDatabaseIfNotExistsAsync(
      DatabaseName, cancellationToken: cancellationToken).ConfigureAwait(false)).Database;
    await database.CreateContainerIfNotExistsAsync(
      InvoicesContainerName, "/UserIdentifier", cancellationToken: cancellationToken).ConfigureAwait(false);
    await database.CreateContainerIfNotExistsAsync(
      MerchantsContainerName, "/ParentCompanyId", cancellationToken: cancellationToken).ConfigureAwait(false);
    Container container = (await database.CreateContainerIfNotExistsAsync(
      InitializationContainerName, "/id", cancellationToken: cancellationToken).ConfigureAwait(false)).Container;
    InitializationReceipt receipt;
    try
    {
      receipt = (await container.ReadItemAsync<InitializationReceipt>(
        InitializationId, new PartitionKey(InitializationId), cancellationToken: cancellationToken).ConfigureAwait(false)).Resource;
    }
    catch (CosmosException exception) when (exception.StatusCode == HttpStatusCode.NotFound)
    {
      receipt = new(InitializationId, manifestVersion,
        proposedAnchorUtc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), false);
      try
      {
        await container.CreateItemAsync(receipt, new PartitionKey(InitializationId),
          cancellationToken: cancellationToken).ConfigureAwait(false);
      }
      catch (CosmosException conflict) when (conflict.StatusCode == HttpStatusCode.Conflict)
      {
        receipt = (await container.ReadItemAsync<InitializationReceipt>(
          InitializationId, new PartitionKey(InitializationId), cancellationToken: cancellationToken).ConfigureAwait(false)).Resource;
      }
    }

    if (receipt.Id != InitializationId || string.IsNullOrWhiteSpace(receipt.ManifestVersion)
      || !DateOnly.TryParseExact(receipt.AnchorDateUtc, "yyyy-MM-dd", CultureInfo.InvariantCulture,
        DateTimeStyles.None, out DateOnly anchor))
    {
      throw new InvalidDataException("Local scenario initialization state is invalid; preserve data before an explicit reset.");
    }
    return new(receipt.ManifestVersion, anchor, receipt.Completed);
  }

  public async Task WriteMissingAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scenario);

    Database database = cosmosClient.GetDatabase(DatabaseName);
    Container merchants = database.GetContainer(MerchantsContainerName);
    Container invoices = database.GetContainer(InvoicesContainerName);

    foreach (Merchant merchant in scenario.Merchants)
    {
      await CreateMissingItemAsync(merchants, merchant, merchant.id.ToString(),
        new PartitionKey(merchant.ParentCompanyId.ToString()),
        cancellationToken).ConfigureAwait(false);
    }

    foreach (Invoice invoice in scenario.Invoices)
    {
      await CreateMissingItemAsync(invoices, invoice, invoice.id.ToString(),
        new PartitionKey(invoice.UserIdentifier.ToString()),
        cancellationToken).ConfigureAwait(false);
    }
  }

  public async Task CompleteInitializationAsync(
    SeedInitializationState state,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(state);
    var receipt = new InitializationReceipt(InitializationId, state.ManifestVersion,
      state.AnchorDateUtc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), true);
    await cosmosClient.GetContainer(DatabaseName, InitializationContainerName).ReplaceItemAsync(
      receipt, InitializationId, new PartitionKey(InitializationId),
      cancellationToken: cancellationToken).ConfigureAwait(false);
  }

  private static async Task CreateMissingItemAsync<T>(
    Container container,
    T item,
    string id,
    PartitionKey partitionKey,
    CancellationToken cancellationToken)
  {
    try
    {
      await container.CreateItemAsync(item, partitionKey,
        cancellationToken: cancellationToken).ConfigureAwait(false);
    }
    catch (CosmosException exception) when (exception.StatusCode == HttpStatusCode.Conflict)
    {
      using ResponseMessage existing = await container.ReadItemStreamAsync(
        id, partitionKey, cancellationToken: cancellationToken).ConfigureAwait(false);
      if (existing.StatusCode == HttpStatusCode.NotFound) { throw; }
      existing.EnsureSuccessStatusCode();
    }
  }

  private sealed record InitializationReceipt(
    [property: JsonProperty("id")] string Id,
    [property: JsonProperty("manifestVersion")] string ManifestVersion,
    [property: JsonProperty("anchorDateUtc")] string AnchorDateUtc,
    [property: JsonProperty("completed")] bool Completed);
}
