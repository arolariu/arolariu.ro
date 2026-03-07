namespace arolariu.Backend.Core.Tests.Common.Configuration;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.Configuration;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="ConfigCatalogCache"/> covering snapshot isolation, update validation,
/// and property-level access for build-time config documents.
/// </summary>
[TestClass]
public sealed class ConfigCatalogCacheTests
{
  private static readonly IReadOnlyDictionary<string, string> InitialConfig =
    new Dictionary<string, string>
    {
      ["Key:One"] = "value-1",
      ["Key:Two"] = "value-2",
    };

  private static ConfigCatalogResponse MakeValidCatalog(
      string version = "v1",
      string contractVersion = "1",
      int refreshSeconds = 120,
      IReadOnlyDictionary<string, string>? config = null) =>
    new()
    {
      Target = "api",
      Version = version,
      ContractVersion = contractVersion,
      RefreshIntervalSeconds = refreshSeconds,
      Config = config ?? InitialConfig,
      FetchedAt = DateTimeOffset.UtcNow,
    };

  [TestMethod]
  public void Ctor_ValidCatalog_StoresCatalog()
  {
    var catalog = MakeValidCatalog(version: "v2", contractVersion: "3");
    var cache = new ConfigCatalogCache(catalog);

    Assert.AreEqual("v2", cache.CurrentCatalog.Version);
    Assert.AreEqual("3", cache.CurrentCatalog.ContractVersion);
    Assert.AreEqual("value-1", cache.CurrentCatalog.Config["Key:One"]);
  }

  [TestMethod]
  public void Ctor_NullCatalog_ThrowsArgumentNullException()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => _ = new ConfigCatalogCache(null!));
  }

  [TestMethod]
  public void Ctor_EmptyVersion_ThrowsArgumentException()
  {
    Assert.ThrowsExactly<ArgumentException>(() => _ = new ConfigCatalogCache(MakeValidCatalog(version: "")));
  }

  [TestMethod]
  public void Ctor_EmptyConfig_ThrowsArgumentException()
  {
    Assert.ThrowsExactly<ArgumentException>(() => _ = new ConfigCatalogCache(MakeValidCatalog(config: new Dictionary<string, string>())));
  }

  [TestMethod]
  public void CurrentCatalog_ReturnsCopyNotOriginalReference()
  {
    var cache = new ConfigCatalogCache(MakeValidCatalog());

    var first = cache.CurrentCatalog;
    var second = cache.CurrentCatalog;

    Assert.AreNotSame(first, second);
    Assert.AreNotSame(first.Config, second.Config);
  }

  [TestMethod]
  public void CreateConfigSnapshot_ReturnsIsolatedCopy()
  {
    var cache = new ConfigCatalogCache(MakeValidCatalog());

    var first = cache.CreateConfigSnapshot();
    var second = cache.CreateConfigSnapshot();

    Assert.AreNotSame(first, second);
    Assert.AreEqual(2, first.Count);
    Assert.AreEqual("value-1", first["Key:One"]);
    Assert.AreEqual("value-2", first["Key:Two"]);
  }

  [TestMethod]
  public void Update_WithValidCatalog_ReplacesSnapshot()
  {
    var cache = new ConfigCatalogCache(MakeValidCatalog(version: "v1"));
    var updated = MakeValidCatalog(
      version: "v99",
      refreshSeconds: 600,
      config: new Dictionary<string, string> { ["Key:Three"] = "value-3" });

    cache.Update(updated);

    Assert.AreEqual("v99", cache.CurrentCatalog.Version);
    Assert.AreEqual(600, cache.CurrentCatalog.RefreshIntervalSeconds);
    Assert.AreEqual("value-3", cache.CurrentCatalog.Config["Key:Three"]);
  }

  [TestMethod]
  public void Update_NullCatalog_ThrowsArgumentNullException()
  {
    var cache = new ConfigCatalogCache(MakeValidCatalog());

    Assert.ThrowsExactly<ArgumentNullException>(() => cache.Update(null!));
  }

  [TestMethod]
  public void Update_EmptyConfig_ThrowsArgumentException()
  {
    var cache = new ConfigCatalogCache(MakeValidCatalog());

    Assert.ThrowsExactly<ArgumentException>(() => cache.Update(MakeValidCatalog(config: new Dictionary<string, string>())));
  }

  [TestMethod]
  public void Ctor_DefaultRefreshInterval_Is300()
  {
    var catalog = new ConfigCatalogResponse
    {
      Target = "api",
      Version = "v1",
      Config = new Dictionary<string, string> { ["SomeKey"] = "SomeValue" },
      FetchedAt = DateTimeOffset.UtcNow,
    };

    var cache = new ConfigCatalogCache(catalog);
    Assert.AreEqual(300, cache.CurrentCatalog.RefreshIntervalSeconds);
  }
}
