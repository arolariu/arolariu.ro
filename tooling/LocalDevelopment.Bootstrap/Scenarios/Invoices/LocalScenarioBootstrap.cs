namespace LocalDevelopment.Bootstrap.Scenarios.Invoices;

using LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;

/// <summary>
/// Coordinates deterministic local reset and seed operations.
/// </summary>
internal sealed class LocalScenarioBootstrap(
  ILocalCosmosResetter cosmos,
  ILocalAzuriteResetter storage,
  TimeProvider timeProvider)
{
  internal async Task RunAsync(
    string manifestPath,
    CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    SeedScenarioManifest manifest = SeedData.LoadManifest(manifestPath);
    DateOnly anchor = DateOnly.FromDateTime(
      timeProvider.GetUtcNow().UtcDateTime);
    MaterializedSeedScenario scenario =
      SeedData.Materialize(manifest, anchor);

    cancellationToken.ThrowIfCancellationRequested();
    await cosmos.ClearAsync(cancellationToken).ConfigureAwait(false);
    cancellationToken.ThrowIfCancellationRequested();
    await storage.ResetAsync(scenario, cancellationToken).ConfigureAwait(false);
    cancellationToken.ThrowIfCancellationRequested();
    await cosmos.WriteAsync(scenario, cancellationToken).ConfigureAwait(false);
  }
}
