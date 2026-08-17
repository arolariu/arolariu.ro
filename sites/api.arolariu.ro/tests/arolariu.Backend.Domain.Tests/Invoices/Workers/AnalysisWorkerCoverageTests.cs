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
/// Adds constructor and startup-failure branch coverage for <see cref="AnalysisWorker"/>.
/// </summary>
[TestClass]
public sealed class AnalysisWorkerCoverageTests
{
  private static readonly TimeSpan FastIdleDelay = TimeSpan.FromMilliseconds(10);

  /// <summary>
  /// Verifies worker construction rejects a null service scope factory.
  /// </summary>
  [TestMethod]
  public void Constructor_NullServiceScopeFactory_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisWorker(null!, NullLogger<AnalysisWorker>.Instance, FastIdleDelay));

  /// <summary>
  /// Verifies worker construction rejects a null logger.
  /// </summary>
  [TestMethod]
  public void Constructor_NullLogger_ThrowsArgumentNullException()
  {
    using var probe = new StartupFailureProbe();
    using ServiceProvider provider = probe.BuildProvider();

    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisWorker(provider.GetRequiredService<IServiceScopeFactory>(), null!, FastIdleDelay));
  }

  /// <summary>
  /// Verifies worker construction rejects negative idle delays.
  /// </summary>
  [TestMethod]
  public void Constructor_NegativeIdleDelay_ThrowsArgumentOutOfRangeException()
  {
    using var probe = new StartupFailureProbe();
    using ServiceProvider provider = probe.BuildProvider();

    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      new AnalysisWorker(
        provider.GetRequiredService<IServiceScopeFactory>(),
        NullLogger<AnalysisWorker>.Instance,
        TimeSpan.FromMilliseconds(-1)));
  }

  /// <summary>
  /// Verifies the two-argument constructor overload - the one production hosting registers - delegates to the
  /// three-argument constructor with the published five-second idle backoff and constructs successfully.
  /// </summary>
  [TestMethod]
  public void Constructor_TwoArgumentOverload_ConstructsSuccessfully()
  {
    using var probe = new StartupFailureProbe();
    using ServiceProvider provider = probe.BuildProvider();

    using var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance);

    Assert.IsNotNull(worker);
  }

  /// <summary>
  /// Verifies best-effort store initialization failures are swallowed and polling still starts.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_StoreInitializationThrows_ContinuesToPoll()
  {
    using var probe = new StartupFailureProbe { EnsureFailure = new InvalidOperationException("startup") };
    using ServiceProvider provider = probe.BuildProvider();
    var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance,
      FastIdleDelay);

    await worker.StartAsync(CancellationToken.None).ConfigureAwait(false);
    await probe.WaitForIterationsAsync(1).ConfigureAwait(false);
    await worker.StopAsync(CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual("ensure-store", probe.Timeline[0]);
    Assert.AreEqual("try-execute", probe.Timeline[1]);
    worker.Dispose();
  }

  /// <summary>
  /// Captures worker service-provider events and iteration signals for startup branch tests.
  /// </summary>
  private sealed class StartupFailureProbe : IDisposable
  {
    private readonly SemaphoreSlim iterationSignal = new(0);

    internal ConcurrentQueue<string> Events { get; } = new();

    internal Exception? EnsureFailure { get; init; }

    internal string[] Timeline => [.. Events];

    internal ServiceProvider BuildProvider()
    {
      var services = new ServiceCollection();
      services.AddScoped<IAnalysisProcessingService>(_ => new FakeAnalysisProcessingService(this));
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

    internal void SignalIteration() => iterationSignal.Release();

    public void Dispose() => iterationSignal.Dispose();
  }

  /// <summary>
  /// Provides scripted analysis processing behavior for the worker under test.
  /// </summary>
  private sealed class FakeAnalysisProcessingService(StartupFailureProbe probe) : IAnalysisProcessingService
  {
    public Task EnsureAnalysisStoreAsync(CancellationToken cancellationToken)
    {
      probe.Events.Enqueue("ensure-store");

      if (probe.EnsureFailure is not null)
      {
        throw probe.EnsureFailure;
      }

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
      return Task.FromResult(false);
    }
  }
}


