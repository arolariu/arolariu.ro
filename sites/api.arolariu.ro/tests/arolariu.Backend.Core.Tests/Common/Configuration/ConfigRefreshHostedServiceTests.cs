namespace arolariu.Backend.Core.Tests.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Configuration;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Tests.Shared.TestDoubles;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="ConfigRefreshHostedService"/> verifying that the hosted service now
/// refreshes from the run-time endpoint while preserving the build-time config cache.
/// </summary>
[TestClass]
public sealed class ConfigRefreshHostedServiceTests
{
  private static readonly DateTimeOffset BaseTime = new(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

  private static ConfigCatalogResponse MakeBuildTime(int refreshSeconds = 1) =>
    new()
    {
      Target = "api",
      Version = "v1",
      ContractVersion = "1",
      RefreshIntervalSeconds = refreshSeconds,
      Config = new Dictionary<string, string> { ["Common:Auth:Secret"] = "startup-secret" },
      FetchedAt = BaseTime,
    };

  private static BootstrapResponse MakeRunTime(
      string secret = "s3cr3t",
      bool analysisEnabled = true) =>
    new()
    {
      Target = "api",
      ContractVersion = "1",
      Version = "v1",
      Config = new Dictionary<string, string> { ["Common:Auth:Secret"] = secret },
      Features = new Dictionary<string, bool> { ["invoices.analysis"] = analysisEnabled },
      RefreshIntervalSeconds = 1,
      FetchedAt = BaseTime,
    };

  [TestMethod]
  public async Task ExecuteAsync_SuccessfulCycle_UpdatesOptionsAndFeatureSnapshot()
  {
    var initialAzureOptions = new AzureOptions { JwtSecret = "original" };
    var optionsMonitor = new FakeOptionsMonitor<AzureOptions>(initialAzureOptions);
    var optionsCache = new FakeOptionsMonitorCache<AzureOptions>(initialAzureOptions);

    var buildTimeCache = new ConfigCatalogCache(MakeBuildTime(refreshSeconds: 1));
    var featureCache = new FeatureSnapshotCache(
      new Dictionary<string, bool> { ["invoices.analysis"] = false }, "v0", BaseTime);

    var proxyClient = new FakeConfigProxyClient(runTimeToReturn: MakeRunTime(secret: "refreshed!", analysisEnabled: true));

    using var svc = new ConfigRefreshHostedService(
      proxyClient,
      buildTimeCache,
      featureCache,
      optionsMonitor,
      optionsCache,
      NullLogger<ConfigRefreshHostedService>.Instance);

    using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(1_500));
    try { await svc.StartAsync(cts.Token).ConfigureAwait(false); } catch (OperationCanceledException) { }
    await Task.Delay(1_600, CancellationToken.None).ConfigureAwait(false);
    await svc.StopAsync(CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual("v1", buildTimeCache.CurrentCatalog.Version);
    Assert.IsTrue(featureCache.IsEnabled("invoices.analysis"));
    Assert.IsTrue(optionsCache.WasSwapped);
  }

  [TestMethod]
  public async Task ExecuteAsync_NullRunTime_PreservesExistingSnapshots()
  {
    var initialAzureOptions = new AzureOptions { JwtSecret = "keep-me" };
    var optionsMonitor = new FakeOptionsMonitor<AzureOptions>(initialAzureOptions);
    var optionsCache = new FakeOptionsMonitorCache<AzureOptions>(initialAzureOptions);

    var buildTimeCache = new ConfigCatalogCache(MakeBuildTime(refreshSeconds: 1));
    var featureCache = new FeatureSnapshotCache(
      new Dictionary<string, bool> { ["feat"] = true }, "v1", BaseTime);

    var proxyClient = new FakeConfigProxyClient(runTimeToReturn: null);

    using var svc = new ConfigRefreshHostedService(
      proxyClient,
      buildTimeCache,
      featureCache,
      optionsMonitor,
      optionsCache,
      NullLogger<ConfigRefreshHostedService>.Instance);

    using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(1_500));
    try { await svc.StartAsync(cts.Token).ConfigureAwait(false); } catch (OperationCanceledException) { }
    await Task.Delay(1_600, CancellationToken.None).ConfigureAwait(false);
    await svc.StopAsync(CancellationToken.None).ConfigureAwait(false);

    Assert.IsFalse(optionsCache.WasSwapped);
    Assert.IsTrue(featureCache.IsEnabled("feat"));
    Assert.AreEqual("v1", buildTimeCache.CurrentCatalog.Version);
  }

  private sealed class FakeConfigProxyClient(BootstrapResponse? runTimeToReturn) : IConfigProxyClient
  {
    public Task<ConfigValueResponse?> GetConfigValueAsync(string name, CancellationToken ct = default) =>
      Task.FromResult<ConfigValueResponse?>(null);

    public Task<ConfigCatalogResponse?> GetBuildTimeAsync(string target, CancellationToken ct = default) =>
      Task.FromResult<ConfigCatalogResponse?>(null);

    public Task<BootstrapResponse?> GetRunTimeAsync(string target, CancellationToken ct = default) =>
      Task.FromResult(runTimeToReturn);
  }

  private sealed class FakeOptionsMonitorCache<TOptions>(TOptions initial) : IOptionsMonitorCache<TOptions>
      where TOptions : class
  {
    private TOptions _current = initial;

    public bool WasSwapped { get; private set; }

    public TOptions GetOrAdd(string? name, Func<TOptions> createOptions) => _current;

    public bool TryAdd(string? name, TOptions options)
    {
      _current = options;
      return true;
    }

    public bool TryRemove(string? name)
    {
      WasSwapped = true;
      return true;
    }

    public void Clear() { }
  }
}
