namespace LocalDevelopment.Bootstrap.Scenarios.Invoices;

using LocalDevelopment.Bootstrap.Resilience;
using LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;

/// <summary>
/// Coordinates deterministic local reset and seed operations.
/// </summary>
internal sealed class LocalScenarioBootstrap(
  ILocalCosmosResetter cosmos,
  ILocalAzuriteResetter storage,
  TimeProvider timeProvider,
  TransientRetry? retry = null)
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

    // Each attempt restarts from the clear phase, so a temporary failure never leaves partial seed data behind.
    await (retry ?? TransientRetry.None).ExecuteAsync(async token =>
    {
      token.ThrowIfCancellationRequested();
      await cosmos.ClearAsync(token).ConfigureAwait(false);
      token.ThrowIfCancellationRequested();
      await storage.ResetAsync(scenario, token).ConfigureAwait(false);
      token.ThrowIfCancellationRequested();
      await cosmos.WriteAsync(scenario, token).ConfigureAwait(false);
    }, cancellationToken).ConfigureAwait(false);
  }
}
