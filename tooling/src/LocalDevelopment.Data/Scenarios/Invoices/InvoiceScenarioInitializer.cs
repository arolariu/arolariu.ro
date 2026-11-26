namespace LocalDevelopment.Data.Scenarios.Invoices;

using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using LocalDevelopment.Data.Scenarios.Invoices.Storage;
using Microsoft.Azure.Cosmos;

/// <summary>Initializes the invoice scenario while preserving existing local data and initialization receipts.</summary>
/// <param name="cosmos">The caller-owned, validated local Cosmos client.</param>
/// <param name="blobs">The caller-owned, validated local blob client.</param>
/// <param name="queues">The caller-owned, validated local queue client.</param>
/// <param name="timeProvider">Supplies the initial UTC anchor and retry timing.</param>
/// <param name="retryLog">Receives sanitized initialization retry diagnostics.</param>
public sealed class InvoiceScenarioInitializer(
  CosmosClient cosmos, BlobServiceClient blobs, QueueServiceClient queues,
  TimeProvider timeProvider, TextWriter retryLog)
{
  /// <summary>Validates all persona inputs, then resumes create-only initialization when required.</summary>
  /// <param name="seedDataDirectory">The directory containing the four coordinated persona JSON files.</param>
  /// <param name="cancellationToken">Cancels initialization without rolling back completed writes.</param>
  /// <returns>A task that completes when the initialization receipt is complete.</returns>
  public Task InitializeAsync(string seedDataDirectory, CancellationToken cancellationToken)
    => InitializeAsync(seedDataDirectory, useBoundBlobOrigin: false, cancellationToken);

  /// <summary>Initializes using the bound blob container URI when the caller reserves it across runs.</summary>
  /// <param name="seedDataDirectory">The directory containing the four coordinated persona JSON files.</param>
  /// <param name="useBoundBlobOrigin">Whether the client points at the durable worktree binding.</param>
  /// <param name="cancellationToken">Cancels initialization without rolling back completed writes.</param>
  /// <returns>A task that completes when the initialization receipt is complete.</returns>
  public Task InitializeAsync(string seedDataDirectory, bool useBoundBlobOrigin, CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(timeProvider);
    return new LocalScenarioBootstrap(
      new LocalCosmosSeedStore(cosmos),
      new LocalAzuriteSeedWriter(blobs, queues),
      timeProvider,
      LocalDataRetryPolicies.Default[LocalDataRetryPolicies.ScenarioTransient],
      retryLog,
      useBoundBlobOrigin ? blobs.GetBlobContainerClient(LocalDataContract.BlobContainerName).Uri : null)
      .RunAsync(seedDataDirectory, cancellationToken);
  }
}
