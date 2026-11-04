namespace LocalDevelopment.Bootstrap.Tests.Scenarios.Invoices;

using System.Net;

using global::LocalDevelopment.Bootstrap.Resilience;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;

using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies initialization, retry, and cancellation ordering at the external storage boundaries.
/// </summary>
[TestClass]
public sealed class LocalScenarioBootstrapTests
{
  /// <summary>Verifies cancellation after receipt lookup cannot start seed writes.</summary>
  [TestMethod]
  public async Task RunAsync_CancelledAfterReceiptRead_DoesNotEnsureStorageOrWrite()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations, afterRead: source.Cancel),
      new RecordingAzuriteResetter(operations), TimeProvider.System);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      bootstrap.RunAsync(ScenarioPath, source.Token));
    CollectionAssert.AreEqual(new[] { "receipt-read" }, operations);
  }

  /// <summary>Verifies cancellation after storage provisioning prevents Cosmos seed writes.</summary>
  [TestMethod]
  public async Task RunAsync_CancelledAfterStorageEnsure_DoesNotWrite()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations),
      new RecordingAzuriteResetter(operations, source.Cancel), TimeProvider.System);
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() => bootstrap.RunAsync(ScenarioPath, source.Token));
    CollectionAssert.AreEqual(new[] { "receipt-read", "storage-ensure" }, operations);
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
    using var files = new SeedScenarioDirectory();
    files.Mutate("bob", part => part["version"] = "");
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations), new RecordingAzuriteResetter(operations), TimeProvider.System);
    await Assert.ThrowsExactlyAsync<InvalidDataException>(() => bootstrap.RunAsync(files.Path, CancellationToken.None));
    Assert.HasCount(0, operations);
  }

  /// <summary>Partial or malformed persona bundles cannot create even an initialization receipt.</summary>
  [TestMethod]
  [DataRow("missing")]
  [DataRow("owner")]
  [DataRow("version")]
  [DataRow("required")]
  public async Task RunAsync_InvalidBundle_PerformsNoOperations(string defect)
  {
    using var files = new SeedScenarioDirectory();
    switch (defect)
    {
      case "missing": files.Remove("dmitryi"); break;
      case "owner": files.Mutate("bob", part => SeedScenarioDirectory.FirstInvoice(part)["ownerKey"] = "alice"); break;
      case "version": files.Mutate("bob", part => part["version"] = "v1"); break;
      case "required": files.Mutate("bob", part => SeedScenarioDirectory.FirstInvoice(part).Remove("totalAmount")); break;
    }
    var operations = new List<string>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations), new RecordingAzuriteResetter(operations), TimeProvider.System);

    await Assert.ThrowsExactlyAsync<InvalidDataException>(() => bootstrap.RunAsync(files.Path, CancellationToken.None));
    Assert.HasCount(0, operations);
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
    CollectionAssert.AreEqual(new[] { source.Token, source.Token, source.Token, source.Token }, tokens);
  }

  private static readonly string ScenarioPath =
    Path.Combine(AppContext.BaseDirectory, "SeedData");

  /// <summary>
  /// Verifies initialization is marked complete only after both storage and Cosmos seed writes.
  /// </summary>
  [TestMethod]
  public async Task RunAsync_ValidScenario_EnsuresThenWritesAndCompletes()
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
      ["receipt-read", "storage-ensure", "cosmos-write", "receipt-complete"];
    CollectionAssert.AreEqual(expected, operations);
  }

  /// <summary>
  /// Verifies a state lookup failure prevents every subsequent write.
  /// </summary>
  [TestMethod]
  public async Task RunAsync_ReceiptReadFails_DoesNotEnsureStorageOrWrite()
  {
    var operations = new List<string>();
    var cosmos = new RecordingCosmosResetter(
      operations,
      readException: new InvalidOperationException("receipt read failed"));
    var storage = new RecordingAzuriteResetter(operations);
    var bootstrap = new LocalScenarioBootstrap(
      cosmos,
      storage,
      TimeProvider.System);

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(
      () => bootstrap.RunAsync(ScenarioPath, CancellationToken.None));

    CollectionAssert.AreEqual(
      new List<string> { "receipt-read" },
      operations);
  }

  /// <summary>A completed legacy store cannot silently adopt the four-persona fixture.</summary>
  [TestMethod]
  public async Task RunAsync_LegacyCompletedReceipt_RefusesAllSeedWrites()
  {
    var operations = new List<string>();
    var bootstrap = new LocalScenarioBootstrap(
      new RecordingCosmosResetter(operations, state: new SeedInitializationState("v1", new DateOnly(2026, 11, 3), true)),
      new RecordingAzuriteResetter(operations), TimeProvider.System);

    InvalidOperationException failure = await Assert.ThrowsExactlyAsync<InvalidOperationException>(() =>
      bootstrap.RunAsync(ScenarioPath, CancellationToken.None));

    StringAssert.Contains(failure.Message, "explicit dashboard reset");
    CollectionAssert.AreEqual(new[] { "receipt-read" }, operations);
  }

  /// <summary>
  /// Verifies retries resume create-only operations without a destructive clear phase.
  /// </summary>
  [TestMethod]
  public async Task RunAsync_TransientWriteFailure_RetriesWithoutClearing()
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
      new[] { "receipt-read", "storage-ensure", "cosmos-write", "receipt-read", "storage-ensure", "cosmos-write", "receipt-complete" },
      operations);
  }

  private sealed class RecordingCosmosResetter(
    List<string> operations,
    Exception? readException = null,
    Action? afterRead = null,
    List<CancellationToken>? tokens = null,
    Queue<Exception>? writeFailures = null,
    SeedInitializationState? state = null) : ILocalCosmosResetter
  {
    public Task<SeedInitializationState> ReadOrCreateInitializationAsync(
      string manifestVersion, DateOnly proposedAnchorUtc, CancellationToken cancellationToken)
    {
      operations.Add("receipt-read");
      tokens?.Add(cancellationToken);
      afterRead?.Invoke();
      return readException is null
        ? Task.FromResult(state ?? new SeedInitializationState(manifestVersion, proposedAnchorUtc, false))
        : Task.FromException<SeedInitializationState>(readException);
    }

    public Task WriteMissingAsync(
      MaterializedSeedScenario scenario,
      CancellationToken cancellationToken)
    {
      operations.Add("cosmos-write");
      tokens?.Add(cancellationToken);
      return writeFailures is { Count: > 0 }
        ? Task.FromException(writeFailures.Dequeue())
        : Task.CompletedTask;
    }

    public Task CompleteInitializationAsync(SeedInitializationState state, CancellationToken cancellationToken)
    {
      operations.Add("receipt-complete");
      tokens?.Add(cancellationToken);
      return Task.CompletedTask;
    }
  }

  private sealed class RecordingAzuriteResetter(
    List<string> operations,
    Action? afterReset = null,
    List<CancellationToken>? tokens = null) : ILocalAzuriteResetter
  {
    public Task EnsureSeedAsync(
      MaterializedSeedScenario scenario,
      CancellationToken cancellationToken)
    {
      operations.Add("storage-ensure");
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
