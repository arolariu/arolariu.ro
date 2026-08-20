namespace arolariu.Backend.Domain.Tests.Invoices.Workers;

using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Workers;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers remaining processed and idle delay branches in the analysis background worker.
/// </summary>
[TestClass]
public sealed class AnalysisWorkerRemainingBranchCoverageTests
{
  private static readonly TimeSpan FastIdleDelay = TimeSpan.FromMilliseconds(10);

  /// <summary>
  /// Verifies one processed iteration uses the zero-delay branch and the next idle iteration uses the configured idle delay.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_ProcessedThenIdleIterations_UsesBothDelayBranches()
  {
    using var probe = new WorkerDelayProbe();
    using ServiceProvider provider = probe.BuildProvider();
    var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    await worker.StartAsync(CancellationToken.None).ConfigureAwait(false);
    await probe.WaitForIterationsAsync(2).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual("try-execute-processed", probe.Timeline[0]);
    Assert.AreEqual("try-execute-idle", probe.Timeline[1]);
    worker.Dispose();
  }

  /// <summary>
  /// Captures deterministic processed/idle worker iterations.
  /// </summary>
  private sealed class WorkerDelayProbe : IDisposable
  {
    private readonly SemaphoreSlim iterationSignal = new(0);
    private int tryExecuteCount;

    internal ConcurrentQueue<string> Events { get; } = new();

    internal string[] Timeline => [.. Events];

    internal ServiceProvider BuildProvider()
    {
      var services = new ServiceCollection();
      services.AddScoped<IInvoiceManagementService>(_ => new FakeAnalysisProcessingService(this));
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

    internal bool NextProcessedValue()
    {
      int call = Interlocked.Increment(ref tryExecuteCount);
      bool processed = call == 1;
      Events.Enqueue(processed ? "try-execute-processed" : "try-execute-idle");
      iterationSignal.Release();
      return processed;
    }

    public void Dispose() => iterationSignal.Dispose();
  }

  /// <summary>
  /// Provides scripted analysis processing behavior for processed and idle worker iterations.
  /// </summary>
  private sealed class FakeAnalysisProcessingService(WorkerDelayProbe probe) : WorkerManagementServiceBase
  {
    public override Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken) =>
      Task.FromResult(probe.NextProcessedValue());
  }
}
