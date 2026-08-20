namespace arolariu.Backend.Domain.Tests.Invoices.Workers;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Workers;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers the analysis worker polling loop guard when cancellation is observed by the processing call itself -
/// mid-iteration - rather than by the idle delay or by an already-cancelled shutdown token at startup.
/// </summary>
[TestClass]
public sealed class AnalysisWorkerMidIterationCancellationTests
{
  private static readonly TimeSpan FastIdleDelay = TimeSpan.FromMilliseconds(10);

  /// <summary>
  /// Verifies that an <see cref="OperationCanceledException"/> raised by the processing call while the shutdown
  /// token is (by then) cancelled is caught by the loop's own cancellation guard and returns the worker cleanly,
  /// without ever reaching the outer idle-delay cancellation guard.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_ProcessingObservesCancellationMidIteration_ReturnsWithoutFaulting()
  {
    using var cancellationSource = new CancellationTokenSource();
    var processing = new CancellingDuringIterationProcessingService(cancellationSource);
    var services = new ServiceCollection();
    services.AddScoped<IInvoiceManagementService>(_ => processing);
    using ServiceProvider provider = services.BuildServiceProvider();
    using var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    await worker.StartAsync(cancellationSource.Token).ConfigureAwait(false);
    Task? executeTask = worker.ExecuteTask;
    Assert.IsNotNull(executeTask);
    await executeTask!.WaitAsync(TimeSpan.FromSeconds(5)).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    Assert.IsNull(executeTask.Exception);
    Assert.AreEqual(1, processing.TryExecuteCalls);
  }

  /// <summary>
  /// Cancels the worker's own shutdown token from inside the polled call before throwing cancellation, simulating
  /// cancellation discovered by the processing layer itself rather than by the idle delay.
  /// </summary>
  private sealed class CancellingDuringIterationProcessingService(CancellationTokenSource cancellationSource) : WorkerManagementServiceBase
  {
    private int tryExecuteCalls;

    /// <summary>Gets the number of polling invocations.</summary>
    internal int TryExecuteCalls => Volatile.Read(ref tryExecuteCalls);

    /// <inheritdoc/>
    public override async Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken)
    {
      Interlocked.Increment(ref tryExecuteCalls);
      await cancellationSource.CancelAsync().ConfigureAwait(false);
      throw new OperationCanceledException(cancellationToken);
    }
  }
}
