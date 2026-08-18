namespace arolariu.Backend.Domain.Tests.Invoices.Workers;

using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;
using arolariu.Backend.Domain.Invoices.Workers;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines behavioural tests for the analysis background worker: store bootstrap, per-iteration scoping, idle
/// backoff, resilience, and clean shutdown.
/// </summary>
[TestClass]
public sealed class AnalysisWorkerTests
{
  private static readonly TimeSpan FastIdleDelay = TimeSpan.FromMilliseconds(10);

  /// <summary>
  /// Verifies that the worker ensures the durable analysis store exists, through a scope, before it polls for
  /// the first run.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_Always_EnsuresAnalysisStoreBeforeFirstPoll()
  {
    // Arrange
    using var probe = new WorkerProbe();
    using ServiceProvider provider = probe.BuildProvider();
    var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    // Act
    await worker.StartAsync(CancellationToken.None).ConfigureAwait(false);
    await probe.WaitForIterationsAsync(1).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual("ensure-store", probe.Timeline[0]);
    Assert.AreEqual("try-execute", probe.Timeline[1]);
    worker.Dispose();
  }

  /// <summary>
  /// Verifies that every poll iteration resolves the processing service from a freshly created scope, so scoped
  /// database contexts are never shared across runs.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_MultiplePolls_ResolvesProcessingThroughNewScopeEachIteration()
  {
    // Arrange
    using var probe = new WorkerProbe();
    using ServiceProvider provider = probe.BuildProvider();
    var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    // Act
    await worker.StartAsync(CancellationToken.None).ConfigureAwait(false);
    await probe.WaitForIterationsAsync(3).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.IsTrue(
      probe.ResolutionCount >= probe.IterationCount,
      $"Expected one processing resolution per iteration; resolutions={probe.ResolutionCount}, iterations={probe.IterationCount}.");
    Assert.IsTrue(
      probe.DistinctScopeCount >= 2,
      $"Expected a distinct scope per iteration, observed {probe.DistinctScopeCount}.");
    worker.Dispose();
  }

  /// <summary>
  /// Verifies that a transient processing failure does not tear down the worker loop.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_ProcessingThrows_ContinuesPolling()
  {
    // Arrange
    using var probe = new WorkerProbe { ExecuteFailure = new InvalidOperationException("transient failure") };
    using ServiceProvider provider = probe.BuildProvider();
    var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    // Act
    await worker.StartAsync(CancellationToken.None).ConfigureAwait(false);
    await probe.WaitForIterationsAsync(2).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.IsTrue(probe.IterationCount >= 2);
    worker.Dispose();
  }

  /// <summary>
  /// Verifies that requesting shutdown stops the loop without surfacing a cancellation failure to the host.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_HostShutdown_StopsWithoutFaulting()
  {
    // Arrange
    using var probe = new WorkerProbe();
    using ServiceProvider provider = probe.BuildProvider();
    var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    // Act
    await worker.StartAsync(CancellationToken.None).ConfigureAwait(false);
    await probe.WaitForIterationsAsync(1).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);
    int iterationsAtStop = probe.IterationCount;
    await Task.Delay(80).ConfigureAwait(false);

    // Assert
    Assert.IsNull(worker.ExecuteTask?.Exception);
    Assert.AreEqual(iterationsAtStop, probe.IterationCount);
    worker.Dispose();
  }

  private sealed class WorkerProbe : IDisposable
  {
    private readonly SemaphoreSlim iterationSignal = new(0);
    private readonly ConcurrentDictionary<int, byte> scopeIdentifiers = new();
    private int iterationCount;
    private int resolutionCount;

    internal ConcurrentQueue<string> Events { get; } = new();

    internal Exception? ExecuteFailure { get; init; }

    internal string[] Timeline => [.. Events];

    internal int IterationCount => Volatile.Read(ref iterationCount);

    internal int ResolutionCount => Volatile.Read(ref resolutionCount);

    internal int DistinctScopeCount => scopeIdentifiers.Count;

    internal ServiceProvider BuildProvider()
    {
      var services = new ServiceCollection();
      services.AddScoped<IAnalysisProcessingService>(serviceProvider =>
      {
        Interlocked.Increment(ref resolutionCount);
        scopeIdentifiers.TryAdd(System.Runtime.CompilerServices.RuntimeHelpers.GetHashCode(serviceProvider), 0);
        return new FakeAnalysisProcessingService(this);
      });

      return services.BuildServiceProvider();
    }

    internal async Task WaitForIterationsAsync(int expected)
    {
      for (int index = 0; index < expected; index++)
      {
        bool signalled = await iterationSignal.WaitAsync(TimeSpan.FromSeconds(5)).ConfigureAwait(false);
        Assert.IsTrue(signalled, $"Timed out waiting for worker iteration {index + 1}.");
      }
    }

    internal void SignalIteration()
    {
      Interlocked.Increment(ref iterationCount);
      iterationSignal.Release();
    }

    public void Dispose() => iterationSignal.Dispose();
  }

  private sealed class FakeAnalysisProcessingService(WorkerProbe probe) : IAnalysisProcessingService
  {
    public Task EnsureAnalysisStoreAsync(CancellationToken cancellationToken)
    {
      probe.Events.Enqueue("ensure-store");
      return Task.CompletedTask;
    }

    public Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
      Guid invoiceId,
      Guid userIdentifier,
      AnalyzeInvoiceRequestDto request,
      CancellationToken cancellationToken) =>
        throw new NotSupportedException();

    public Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
      Guid merchantId,
      Guid userIdentifier,
      AnalyzeMerchantRequestDto request,
      CancellationToken cancellationToken) =>
        throw new NotSupportedException();

    public Task<bool> TryExecuteNextRunAsync(string leaseOwner, CancellationToken cancellationToken)
    {
      probe.Events.Enqueue("try-execute");
      probe.SignalIteration();

      if (probe.ExecuteFailure is not null)
      {
        throw probe.ExecuteFailure;
      }

      return Task.FromResult(false);
    }
  }
}
