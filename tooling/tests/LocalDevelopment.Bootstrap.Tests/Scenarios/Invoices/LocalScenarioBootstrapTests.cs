namespace LocalDevelopment.Bootstrap.Tests.Scenarios.Invoices;

using System.Net;

using global::LocalDevelopment.Bootstrap.Resilience;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;

using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies reset and seed orchestration order.
/// </summary>
[TestClass]
public sealed class LocalScenarioBootstrapTests
{
  /// <summary>Verifies cancellation between phases cannot start further destructive work.</summary>
  [TestMethod]
  public async Task RunAsync_CancelledAfterCosmosClear_DoesNotResetStorageOrWrite()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations, afterClear: source.Cancel),
      new RecordingAzuriteResetter(operations), TimeProvider.System);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      bootstrap.RunAsync(ScenarioPath, source.Token));
    CollectionAssert.AreEqual(new[] { "cosmos-clear" }, operations);
  }

  /// <summary>Verifies cancellation after storage reset prevents Cosmos seed writes.</summary>
  [TestMethod]
  public async Task RunAsync_CancelledAfterStorageReset_DoesNotWrite()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations),
      new RecordingAzuriteResetter(operations, source.Cancel), TimeProvider.System);
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() => bootstrap.RunAsync(ScenarioPath, source.Token));
    CollectionAssert.AreEqual(new[] { "cosmos-clear", "storage-reset" }, operations);
  }

  /// <summary>Verifies pre-cancellation performs no reset phase.</summary>
  [TestMethod]
  public async Task RunAsync_PreCancelled_PerformsNoOperations()
  {
    var operations = new List<string>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations), new RecordingAzuriteResetter(operations), TimeProvider.System);
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      bootstrap.RunAsync(ScenarioPath, new CancellationToken(true)));
    Assert.HasCount(0, operations);
  }

  /// <summary>Verifies invalid input is rejected before destructive operations.</summary>
  [TestMethod]
  public async Task RunAsync_InvalidManifest_PerformsNoOperations()
  {
    var operations = new List<string>();
    string path = Path.GetTempFileName();
    File.WriteAllText(path, """{"Version":""}""");
    try
    {
      var bootstrap = new LocalScenarioBootstrap(
        new RecordingCosmosResetter(operations), new RecordingAzuriteResetter(operations), TimeProvider.System);
      await Assert.ThrowsExactlyAsync<InvalidDataException>(() => bootstrap.RunAsync(path, CancellationToken.None));
      Assert.HasCount(0, operations);
    }
    finally { File.Delete(path); }
  }

  /// <summary>Verifies all external phase boundaries receive the same caller token.</summary>
  [TestMethod]
  public async Task RunAsync_ValidScenario_ForwardsCallerToken()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var tokens = new List<CancellationToken>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations, tokens: tokens),
      new RecordingAzuriteResetter(operations, tokens: tokens), TimeProvider.System);
    await bootstrap.RunAsync(ScenarioPath, source.Token);
    CollectionAssert.AreEqual(new[] { source.Token, source.Token, source.Token }, tokens);
  }

  private static readonly string ScenarioPath =
    Path.Combine(AppContext.BaseDirectory, "SeedData", "scenario.v1.json");

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

  /// <summary>
  /// Verifies a temporary failure during seed writes restarts the whole reset instead of writing over partial data.
  /// </summary>
  [TestMethod]
  public async Task RunAsync_TransientWriteFailure_RestartsFromClear()
  {
    var operations = new List<string>();
    var failures = new Queue<Exception>([new CosmosException("busy", HttpStatusCode.ServiceUnavailable, 0, "activity", 0)]);
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations, writeFailures: failures),
      new RecordingAzuriteResetter(operations),
      TimeProvider.System,
      new TransientRetry(5, TimeSpan.Zero, (_, _) => Task.CompletedTask, TextWriter.Null));

    await bootstrap.RunAsync(ScenarioPath, CancellationToken.None);

    CollectionAssert.AreEqual(
      new[] { "cosmos-clear", "storage-reset", "cosmos-write", "cosmos-clear", "storage-reset", "cosmos-write" },
      operations);
  }

  private sealed class RecordingCosmosResetter(
    List<string> operations,
    Exception? clearException = null,
    Action? afterClear = null,
    List<CancellationToken>? tokens = null,
    Queue<Exception>? writeFailures = null) : ILocalCosmosResetter
  {
    public Task ClearAsync(CancellationToken cancellationToken)
    {
      operations.Add("cosmos-clear");
      tokens?.Add(cancellationToken);
      afterClear?.Invoke();
      return clearException is null
        ? Task.CompletedTask
        : Task.FromException(clearException);
    }

    public Task WriteAsync(
      MaterializedSeedScenario scenario,
      CancellationToken cancellationToken)
    {
      operations.Add("cosmos-write");
      tokens?.Add(cancellationToken);
      return writeFailures is { Count: > 0 }
        ? Task.FromException(writeFailures.Dequeue())
        : Task.CompletedTask;
    }
  }

  private sealed class RecordingAzuriteResetter(
    List<string> operations,
    Action? afterReset = null,
    List<CancellationToken>? tokens = null) : ILocalAzuriteResetter
  {
    public Task ResetAsync(
      MaterializedSeedScenario scenario,
      CancellationToken cancellationToken)
    {
      operations.Add("storage-reset");
      tokens?.Add(cancellationToken);
      afterReset?.Invoke();
      return Task.CompletedTask;
    }
  }

  private sealed class FixedTimeProvider(
    DateTimeOffset instant) : TimeProvider
  {
    public override DateTimeOffset GetUtcNow() => instant;
  }
}
