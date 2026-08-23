namespace AppHost.Tests;

using LocalDevelopment.Bootstrap;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies reset and seed orchestration order.
/// </summary>
[TestClass]
public sealed class LocalScenarioBootstrapTests
{
  private static readonly string ScenarioPath = Path.GetFullPath(
    Path.Combine(
      AppContext.BaseDirectory,
      "..",
      "..",
      "..",
      "..",
      "LocalDevelopment.Bootstrap",
      "SeedData",
      "scenario.v1.json"));

  /// <summary>
  /// Verifies every previous document and blob is cleared before seed writes.
  /// </summary>
  [TestMethod]
  public async Task RunAsync_ValidScenario_ResetsThenWritesStorageAndCosmos()
  {
    var operations = new List<string>();
    var cosmos = new RecordingCosmosResetter(operations);
    var storage = new RecordingAzuriteResetter(operations);
    var bootstrap = new LocalScenarioBootstrap(
      cosmos,
      storage,
      new FixedTimeProvider(
        new DateTimeOffset(2026, 8, 21, 12, 0, 0, TimeSpan.Zero)));

    await bootstrap.RunAsync(ScenarioPath, CancellationToken.None);

    List<string> expected =
      ["cosmos-clear", "storage-reset", "cosmos-write"];
    CollectionAssert.AreEqual(expected, operations);
  }

  /// <summary>
  /// Verifies a reset failure prevents every subsequent write.
  /// </summary>
  [TestMethod]
  public async Task RunAsync_CosmosResetFails_DoesNotResetStorageOrWrite()
  {
    var operations = new List<string>();
    var cosmos = new RecordingCosmosResetter(
      operations,
      clearException: new InvalidOperationException("reset failed"));
    var storage = new RecordingAzuriteResetter(operations);
    var bootstrap = new LocalScenarioBootstrap(
      cosmos,
      storage,
      TimeProvider.System);

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(
      () => bootstrap.RunAsync(ScenarioPath, CancellationToken.None));

    CollectionAssert.AreEqual(
      new List<string> { "cosmos-clear" },
      operations);
  }

  private sealed class RecordingCosmosResetter(
    List<string> operations,
    Exception? clearException = null) : ILocalCosmosResetter
  {
    public Task ClearAsync(CancellationToken cancellationToken)
    {
      operations.Add("cosmos-clear");
      return clearException is null
        ? Task.CompletedTask
        : Task.FromException(clearException);
    }

    public Task WriteAsync(
      MaterializedSeedScenario scenario,
      CancellationToken cancellationToken)
    {
      operations.Add("cosmos-write");
      return Task.CompletedTask;
    }
  }

  private sealed class RecordingAzuriteResetter(
    List<string> operations) : ILocalAzuriteResetter
  {
    public Task ResetAsync(
      MaterializedSeedScenario scenario,
      CancellationToken cancellationToken)
    {
      operations.Add("storage-reset");
      return Task.CompletedTask;
    }
  }

  private sealed class FixedTimeProvider(
    DateTimeOffset instant) : TimeProvider
  {
    public override DateTimeOffset GetUtcNow() => instant;
  }
}
