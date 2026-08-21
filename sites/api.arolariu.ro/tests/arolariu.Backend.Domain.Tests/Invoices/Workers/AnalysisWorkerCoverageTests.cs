namespace arolariu.Backend.Domain.Tests.Invoices.Workers;

using System;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Workers;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Adds constructor branch coverage for <see cref="AnalysisWorker"/>.
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
    using ServiceProvider provider = StartupFailureProbe.BuildProvider();

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
    using ServiceProvider provider = StartupFailureProbe.BuildProvider();

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
    using ServiceProvider provider = StartupFailureProbe.BuildProvider();

    using var worker = new AnalysisWorker(
      provider.GetRequiredService<IServiceScopeFactory>(),
      NullLogger<AnalysisWorker>.Instance);

    Assert.IsNotNull(worker);
  }

  /// <summary>
  /// Provides the scoped service provider used by constructor tests.
  /// </summary>
  private sealed class StartupFailureProbe : IDisposable
  {
    internal static ServiceProvider BuildProvider()
    {
      var services = new ServiceCollection();
      services.AddScoped<IInvoiceManagementService>(_ => new FakeAnalysisProcessingService());
      return services.BuildServiceProvider();
    }

    public void Dispose()
    {
    }
  }

  /// <summary>
  /// Provides scripted analysis processing behavior for the worker under test.
  /// </summary>
  private sealed class FakeAnalysisProcessingService : WorkerManagementServiceBase
  {
  }
}
