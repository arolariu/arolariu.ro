namespace LocalDevelopment.Tests.AppHost.Infrastructure.Storage;

using global::AppHost.Infrastructure.Storage;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging.Abstractions;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the local Azurite bootstrap connection contract.
/// </summary>
[TestClass]
public sealed class AzuriteBootstrapTests
{
  /// <summary>Verifies initial polling cannot create the readiness/provisioning cycle.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_BeforeReady_DoesNotProvision()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    int calls = 0;
    var check = new AzuriteBootstrap.BootstrapHealthCheck(state,
      _ => { calls++; return Task.CompletedTask; }, NullLogger.Instance);
    HealthCheckResult result = await check.CheckHealthAsync(new HealthCheckContext());
    Assert.AreEqual(HealthStatus.Healthy, result.Status);
    Assert.AreEqual(0, calls);
  }

  /// <summary>Verifies health polling recovers a failure without requiring another ready event.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_PreviousFailure_RecoversAndDoesNotRepeatSuccess()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    await Assert.ThrowsExactlyAsync<IOException>(() =>
      state.RunOnceAsync(_ => Task.FromException(new IOException("initial failure")), CancellationToken.None));
    int calls = 0;
    var check = new AzuriteBootstrap.BootstrapHealthCheck(state,
      _ => { calls++; return Task.CompletedTask; }, NullLogger.Instance);

    HealthCheckResult recovered = await check.CheckHealthAsync(new HealthCheckContext());
    HealthCheckResult subsequent = await check.CheckHealthAsync(new HealthCheckContext());

    Assert.AreEqual(HealthStatus.Healthy, recovered.Status);
    Assert.AreEqual(HealthStatus.Healthy, subsequent.Status);
    Assert.IsNull(state.Error);
    Assert.AreEqual(1, calls);
  }

  /// <summary>Verifies persistent failures stay unhealthy and preserve the latest cause.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_RecoveryFails_RemainsUnhealthyWithOriginalError()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    await Assert.ThrowsExactlyAsync<IOException>(() =>
      state.RunOnceAsync(_ => Task.FromException(new IOException("initial failure")), CancellationToken.None));
    var failure = new IOException("still unavailable");
    var check = new AzuriteBootstrap.BootstrapHealthCheck(state,
      _ => Task.FromException(failure), NullLogger.Instance);
    HealthCheckResult result = await check.CheckHealthAsync(new HealthCheckContext());
    Assert.AreEqual(HealthStatus.Unhealthy, result.Status);
    Assert.AreSame(failure, result.Exception);
  }

  /// <summary>Verifies each failed poll retains the six-attempt operation budget.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_PersistentFailure_BoundsAttemptsPerPoll()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    await Assert.ThrowsExactlyAsync<IOException>(() =>
      state.RunOnceAsync(_ => Task.FromException(new IOException("initial failure")), CancellationToken.None));
    var failure = new IOException("still unavailable");
    int attempts = 0;
    var delays = new List<double>();
    var check = new AzuriteBootstrap.BootstrapHealthCheck(state,
      token => AzuriteBootstrap.RetryAsync("test",
        _ => { attempts++; return Task.FromException(failure); }, NullLogger.Instance,
        (delay, _) => { delays.Add(delay.TotalSeconds); return Task.CompletedTask; }, token),
      NullLogger.Instance);

    HealthCheckResult first = await check.CheckHealthAsync(new HealthCheckContext());
    Assert.AreEqual(6, attempts);
    HealthCheckResult second = await check.CheckHealthAsync(new HealthCheckContext());

    Assert.AreEqual(HealthStatus.Unhealthy, first.Status);
    Assert.AreEqual(HealthStatus.Unhealthy, second.Status);
    Assert.AreSame(failure, second.Exception);
    Assert.AreEqual(12, attempts);
    CollectionAssert.AreEqual(new[] { 1d, 2d, 3d, 4d, 5d, 1d, 2d, 3d, 4d, 5d }, delays);
  }

  /// <summary>Verifies overlapping polling cannot duplicate recovery or prematurely mark it healthy.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_ConcurrentRecovery_RunsOnceAndStaysUnhealthyUntilComplete()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    await Assert.ThrowsExactlyAsync<IOException>(() =>
      state.RunOnceAsync(_ => Task.FromException(new IOException("initial failure")), CancellationToken.None));
    var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    int calls = 0;
    var check = new AzuriteBootstrap.BootstrapHealthCheck(state,
      async token => { calls++; await gate.Task.WaitAsync(token); }, NullLogger.Instance);
    Task<HealthCheckResult> first = check.CheckHealthAsync(new HealthCheckContext());
    try
    {
      HealthCheckResult concurrent = await check.CheckHealthAsync(new HealthCheckContext());
      Assert.AreEqual(HealthStatus.Unhealthy, concurrent.Status);
      Assert.AreEqual(1, calls);
    }
    finally { gate.TrySetResult(); }
    Assert.AreEqual(HealthStatus.Healthy, (await first).Status);
  }

  /// <summary>Verifies cancelled recovery remains retryable and cancellation is not swallowed.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_RecoveryCancelled_PropagatesAndAllowsFutureRecovery()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    await Assert.ThrowsExactlyAsync<IOException>(() =>
      state.RunOnceAsync(_ => Task.FromException(new IOException("initial failure")), CancellationToken.None));
    using var source = new CancellationTokenSource();
    var check = new AzuriteBootstrap.BootstrapHealthCheck(state,
      token => { source.Cancel(); token.ThrowIfCancellationRequested(); return Task.CompletedTask; },
      NullLogger.Instance);
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      check.CheckHealthAsync(new HealthCheckContext(), source.Token));
    Assert.IsNotNull(state.Error);
    var retry = new AzuriteBootstrap.BootstrapHealthCheck(state,
      _ => Task.CompletedTask, NullLogger.Instance);
    Assert.AreEqual(HealthStatus.Healthy, (await retry.CheckHealthAsync(new HealthCheckContext())).Status);
  }

  /// <summary>Verifies cancellation that wins the completion race does not seal successful state.</summary>
  [TestMethod]
  public async Task RunOnceAsync_CancelledAtCompletion_ReleasesGuardWithoutSuccess()
  {
    using var source = new CancellationTokenSource();
    var state = new AzuriteBootstrap.BootstrapState();
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      state.RunOnceAsync(_ => { source.Cancel(); return Task.CompletedTask; }, source.Token));
    Assert.IsNull(state.Error);
    int subsequentCalls = 0;
    await state.RunOnceAsync(_ => { subsequentCalls++; return Task.CompletedTask; }, CancellationToken.None);
    Assert.AreEqual(1, subsequentCalls);
  }

  /// <summary>Verifies a provider's successful return cannot hide caller cancellation.</summary>
  [TestMethod]
  public async Task RetryAsync_CancelledAtCompletion_ThrowsWithoutRetry()
  {
    using var source = new CancellationTokenSource();
    int delays = 0;
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      AzuriteBootstrap.RetryAsync("test",
        _ => { source.Cancel(); return Task.CompletedTask; }, null,
        (_, _) => { delays++; return Task.CompletedTask; }, source.Token));
    Assert.AreEqual(0, delays);
  }

  /// <summary>Verifies separate registrations cannot share successful state.</summary>
  [TestMethod]
  public async Task RunOnceAsync_TwoStates_RunIndependently()
  {
    int calls = 0;
    Task Provision(CancellationToken _) { calls++; return Task.CompletedTask; }
    await new AzuriteBootstrap.BootstrapState().RunOnceAsync(Provision, CancellationToken.None);
    await new AzuriteBootstrap.BootstrapState().RunOnceAsync(Provision, CancellationToken.None);
    Assert.AreEqual(2, calls);
  }

  /// <summary>Verifies overlapping and subsequent notifications cannot repeat successful work.</summary>
  [TestMethod]
  public async Task RunOnceAsync_ConcurrentNotifications_InvokesOnce()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    int calls = 0;
    async Task Provision(CancellationToken token) { calls++; await gate.Task.WaitAsync(token); }
    Task first = state.RunOnceAsync(Provision, CancellationToken.None);
    await state.RunOnceAsync(Provision, CancellationToken.None);
    Assert.AreEqual(1, calls);
    gate.SetResult();
    await first;
    await state.RunOnceAsync(Provision, CancellationToken.None);
    Assert.AreEqual(1, calls);
  }

  /// <summary>Verifies failures preserve their identity and release the registration guard.</summary>
  [TestMethod]
  public async Task RunOnceAsync_Failure_ReleasesGuardAndClearsErrorAfterSuccess()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    var failure = new IOException("failure");
    IOException thrown = await Assert.ThrowsExactlyAsync<IOException>(() =>
      state.RunOnceAsync(_ => Task.FromException(failure), CancellationToken.None));
    Assert.AreSame(failure, thrown);
    Assert.AreSame(failure, state.Error);
    int calls = 0;
    await state.RunOnceAsync(_ => { calls++; return Task.CompletedTask; }, CancellationToken.None);
    Assert.AreEqual(1, calls);
    Assert.IsNull(state.Error);
  }

  /// <summary>Verifies cancellation is not a success and a future notification can run.</summary>
  [TestMethod]
  public async Task RunOnceAsync_Cancelled_ReleasesGuard()
  {
    var state = new AzuriteBootstrap.BootstrapState();
    var cancelled = new OperationCanceledException();
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      state.RunOnceAsync(_ => Task.FromException(cancelled), CancellationToken.None));
    Assert.IsNull(state.Error);
    int calls = 0;
    await state.RunOnceAsync(_ => { calls++; return Task.CompletedTask; }, CancellationToken.None);
    Assert.AreEqual(1, calls);
  }

  /// <summary>Verifies six attempts, exact backoff, and original terminal failure.</summary>
  [TestMethod]
  public async Task RetryAsync_AlwaysFails_UsesSixAttemptsAndPreservesException()
  {
    var failure = new IOException("failure");
    int calls = 0;
    var delays = new List<double>();
    IOException thrown = await Assert.ThrowsExactlyAsync<IOException>(() =>
      AzuriteBootstrap.RetryAsync("test",
        _ => { calls++; return Task.FromException(failure); }, null,
        (delay, _) => { delays.Add(delay.TotalSeconds); return Task.CompletedTask; },
        CancellationToken.None));
    Assert.AreSame(failure, thrown);
    Assert.AreEqual(6, calls);
    CollectionAssert.AreEqual(new[] { 1d, 2d, 3d, 4d, 5d }, delays);
  }

  /// <summary>Verifies provider cancellation never enters the retry delay.</summary>
  [TestMethod]
  public async Task RetryAsync_Cancelled_DoesNotRetry()
  {
    var cancellation = new OperationCanceledException();
    int calls = 0;
    int delays = 0;
    OperationCanceledException thrown = await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      AzuriteBootstrap.RetryAsync("test",
        _ => { calls++; return Task.FromException(cancellation); }, null,
        (_, _) => { delays++; return Task.CompletedTask; }, CancellationToken.None));
    Assert.AreSame(cancellation, thrown);
    Assert.AreEqual(1, calls);
    Assert.AreEqual(0, delays);
  }

  /// <summary>Verifies cancellation during backoff stops the next provider call.</summary>
  [TestMethod]
  public async Task RetryAsync_CancelledDuringDelay_DoesNotStartNextAttempt()
  {
    using var source = new CancellationTokenSource();
    int calls = 0;
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      AzuriteBootstrap.RetryAsync("test",
        _ => { calls++; return Task.FromException(new IOException("failure")); }, null,
        (_, token) => { source.Cancel(); token.ThrowIfCancellationRequested(); return Task.CompletedTask; },
        source.Token));
    Assert.AreEqual(1, calls);
  }

  /// <summary>Verifies child-resource matching and failure state stay registration-local.</summary>
  [TestMethod]
  public async Task CreateReadyHandler_ChildAndUnrelatedResources_IsolatesRegistrationState()
  {
    using ServiceProvider services = new ServiceCollection().AddLogging().BuildServiceProvider();
    var target = new TestResource("storage");
    var child = new ChildResource("emulator", target);
    var state = new AzuriteBootstrap.BootstrapState();
    var other = new AzuriteBootstrap.BootstrapState();
    var failure = new IOException("failure");
    int calls = 0;
    var handler = AzuriteBootstrap.CreateReadyHandler(target, state,
      (_, _) => { calls++; return Task.FromException(failure); });
    await handler(new ResourceReadyEvent(new TestResource("unrelated"), services), CancellationToken.None);
    Assert.AreEqual(0, calls);
    await handler(new ResourceReadyEvent(child, services), CancellationToken.None);
    Assert.AreEqual(1, calls);
    Assert.AreSame(failure, state.Error);
    Assert.IsNull(other.Error);
    await other.RunOnceAsync(_ => Task.CompletedTask, CancellationToken.None);
    Assert.AreSame(failure, state.Error);
  }

  private sealed class TestResource(string name) : Resource(name);
  private sealed class ChildResource(string name, IResource parent) : Resource(name), IResourceWithParent
  {
    public IResource Parent { get; } = parent;
  }

  /// <summary>
  /// Verifies the bootstrap connection string targets both Azurite services.
  /// </summary>
  [TestMethod]
  public void CreateConnectionString_ValidPorts_ContainsBlobAndQueueEndpoints()
  {
    string connectionString = AzuriteBootstrap.CreateConnectionString(
      blobPort: 10000,
      queuePort: 10001);

    StringAssert.Contains(
      connectionString,
      "BlobEndpoint=http://localhost:10000/devstoreaccount1");
    StringAssert.Contains(
      connectionString,
      "QueueEndpoint=http://localhost:10001/devstoreaccount1");
  }

  /// <summary>
  /// Verifies non-positive service ports are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(0, 10001)]
  [DataRow(10000, 0)]
  public void CreateConnectionString_NonPositivePort_ThrowsArgumentOutOfRangeException(
    int blobPort,
    int queuePort)
  {
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(
      () => AzuriteBootstrap.CreateConnectionString(blobPort, queuePort));
  }
}
