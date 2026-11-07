namespace LocalDevelopment.Data.Scenarios.Invoices;

using System.Globalization;
using Azure;
using LocalDevelopment.Common.Http.Resilience;
using LocalDevelopment.Data.Scenarios.Invoices.Storage;
using Microsoft.Azure.Cosmos;

/// <summary>
/// Coordinates resumable first-use seeding while preserving existing local data.
/// </summary>
internal sealed class LocalScenarioBootstrap(
  ILocalCosmosSeedStore cosmos,
  ILocalAzuriteSeedWriter storage,
  TimeProvider timeProvider,
  RetryPolicy? retry = null,
  TextWriter? retryLog = null)
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

    await RetryExecutor.ExecuteAsync(retry ?? LocalDataRetryPolicies.Default[LocalDataRetryPolicies.None], async token =>
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
    }, cancellationToken, context => LogRetryAsync(retryLog ?? TextWriter.Null, context),
      (wait, token) => Task.Delay(wait, timeProvider, token)).ConfigureAwait(false);
  }

  internal static Task LogRetryAsync(TextWriter log, RetryContext context) =>
    log.WriteLineAsync(string.Create(CultureInfo.InvariantCulture,
      $"Local development bootstrap attempt {context.Attempt}/{context.MaxAttempts} failed with {Describe(context.Exception)}; retrying in {context.Delay.TotalSeconds:0.###} s."));

  private static string Describe(Exception exception) => exception switch
  {
    CosmosException cosmos => string.Create(CultureInfo.InvariantCulture,
      $"{nameof(CosmosException)} {(int)cosmos.StatusCode}"),
    RequestFailedException storage => string.Create(CultureInfo.InvariantCulture,
      $"{nameof(RequestFailedException)} {storage.Status}"),
    _ => exception.GetType().Name,
  };
}
