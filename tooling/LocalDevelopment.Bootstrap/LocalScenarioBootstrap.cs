namespace LocalDevelopment.Bootstrap;

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
    SeedScenarioManifest manifest = SeedData.LoadManifest(manifestPath);
    DateOnly anchor = DateOnly.FromDateTime(
      timeProvider.GetUtcNow().UtcDateTime);
    MaterializedSeedScenario scenario =
      SeedData.Materialize(manifest, anchor);

    await cosmos.ClearAsync(cancellationToken).ConfigureAwait(false);
    await storage.ResetAsync(scenario, cancellationToken).ConfigureAwait(false);
    await cosmos.WriteAsync(scenario, cancellationToken).ConfigureAwait(false);
  }
}
