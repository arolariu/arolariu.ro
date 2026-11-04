namespace LocalDevelopment.Data.Scenarios.Invoices;

using LocalDevelopment.Data.Resilience;
using LocalDevelopment.Data.Scenarios.Invoices.Storage;

/// <summary>
/// Coordinates resumable first-use seeding while preserving existing local data.
/// </summary>
internal sealed class LocalScenarioBootstrap(
  ILocalCosmosSeedStore cosmos,
  ILocalAzuriteSeedWriter storage,
  TimeProvider timeProvider,
  TransientRetry? retry = null)
{
  internal async Task RunAsync(
    string seedDataDirectory,
    CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    SeedScenarioManifest manifest = SeedData.LoadScenario(seedDataDirectory);
    DateOnly anchor = DateOnly.FromDateTime(
      timeProvider.GetUtcNow().UtcDateTime);
    MaterializedSeedScenario proposedScenario =
      SeedData.Materialize(manifest, anchor);

    await (retry ?? TransientRetry.None).ExecuteAsync(async token =>
    {
      token.ThrowIfCancellationRequested();
      SeedInitializationState state = await cosmos.ReadOrCreateInitializationAsync(
        manifest.Version, anchor, token).ConfigureAwait(false);
      if (!string.Equals(state.ManifestVersion, manifest.Version, StringComparison.Ordinal))
      {
        throw new InvalidOperationException(
          "Seed manifest version changed; preserve local data and use the explicit dashboard reset before switching versions.");
      }
      if (state.Completed) { return; }
      MaterializedSeedScenario scenario = state.AnchorDateUtc == anchor
        ? proposedScenario
        : SeedData.Materialize(manifest, state.AnchorDateUtc);
      token.ThrowIfCancellationRequested();
      await storage.EnsureSeedAsync(scenario, token).ConfigureAwait(false);
      token.ThrowIfCancellationRequested();
      await cosmos.WriteMissingAsync(scenario, token).ConfigureAwait(false);
      token.ThrowIfCancellationRequested();
      await cosmos.CompleteInitializationAsync(state, token).ConfigureAwait(false);
    }, cancellationToken).ConfigureAwait(false);
  }
}
