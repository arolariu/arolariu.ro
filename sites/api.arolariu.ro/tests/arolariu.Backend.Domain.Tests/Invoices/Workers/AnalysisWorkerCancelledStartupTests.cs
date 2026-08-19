namespace arolariu.Backend.Domain.Tests.Invoices.Workers;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Workers;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers the analysis worker polling loop guard when the host shutdown token is already cancelled, and when
/// cancellation is observed during durable store provisioning before the polling loop is ever entered.
/// </summary>
[TestClass]
public sealed class AnalysisWorkerCancelledStartupTests
{
  private static readonly TimeSpan FastIdleDelay = TimeSpan.FromMilliseconds(10);

  /// <summary>
  /// Verifies a pre-cancelled shutdown token skips the polling loop entirely after store provisioning.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_ShutdownTokenAlreadyCancelled_SkipsPollingLoop()
  {
    var processing = new CountingAnalysisProcessingService();
    var services = new ServiceCollection();
    services.AddScoped<IInvoiceManagementService>(_ => processing);
    using ServiceProvider provider = services.BuildServiceProvider();
    using var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);
    using var stoppingSource = new CancellationTokenSource();
    await stoppingSource.CancelAsync().ConfigureAwait(false);

    await worker.StartAsync(stoppingSource.Token).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(0, processing.TryExecuteCalls);
  }

  /// <summary>
  /// Verifies that an <see cref="OperationCanceledException"/> observed while provisioning the durable store -
  /// with the shutdown token cancelled by the provisioning call itself - is caught by the provisioning-specific
  /// cancellation guard and returns cleanly. Because the shutdown token becomes cancelled before the polling loop's
  /// condition is evaluated for the first time, this also exercises the loop's clean-exit path without ever
  /// entering the loop body.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_StoreInitializationObservesCancellation_ExitsPollingLoopWithoutFaulting()
  {
    using var stoppingSource = new CancellationTokenSource();
    var processing = new CancellingEnsureStoreProcessingService(stoppingSource);
    var services = new ServiceCollection();
    services.AddScoped<IInvoiceManagementService>(_ => processing);
    using ServiceProvider provider = services.BuildServiceProvider();
    using var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    await worker.StartAsync(stoppingSource.Token).ConfigureAwait(false);
    Task? executeTask = worker.ExecuteTask;
    Assert.IsNotNull(executeTask);
    await executeTask!.WaitAsync(TimeSpan.FromSeconds(5)).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(TaskStatus.RanToCompletion, executeTask.Status);
    Assert.IsNull(executeTask.Exception);
    Assert.AreEqual(0, processing.TryExecuteCalls);
  }

  /// <summary>
  /// Records how many times the worker invoked each processing entry point.
  /// </summary>
  private sealed class CountingAnalysisProcessingService : WorkerManagementServiceBase
  {
    private int ensureStoreCalls;
    private int tryExecuteCalls;

    /// <summary>Gets the number of store provisioning invocations.</summary>
    internal int EnsureStoreCalls => Volatile.Read(ref ensureStoreCalls);

    /// <summary>Gets the number of polling invocations.</summary>
    internal int TryExecuteCalls => Volatile.Read(ref tryExecuteCalls);

    /// <inheritdoc/>
    public override Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken)
    {
      Interlocked.Increment(ref ensureStoreCalls);
      return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public override Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken)
    {
      Interlocked.Increment(ref tryExecuteCalls);
      return Task.FromResult(false);
    }
  }

  /// <summary>
  /// Cancels the worker's own shutdown token from inside store provisioning before throwing cancellation,
  /// simulating cancellation discovered by the provisioning call itself rather than by a pre-cancelled token.
  /// </summary>
  private sealed class CancellingEnsureStoreProcessingService(CancellationTokenSource shutdownSource) : WorkerManagementServiceBase
  {
    private int tryExecuteCalls;

    /// <summary>Gets the number of polling invocations.</summary>
    internal int TryExecuteCalls => Volatile.Read(ref tryExecuteCalls);

    /// <inheritdoc/>
    public override async Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken)
    {
      await shutdownSource.CancelAsync().ConfigureAwait(false);
      throw new OperationCanceledException(cancellationToken);
    }

    /// <inheritdoc/>
    public override Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken)
    {
      Interlocked.Increment(ref tryExecuteCalls);
      return Task.FromResult(false);
    }
  }
}
