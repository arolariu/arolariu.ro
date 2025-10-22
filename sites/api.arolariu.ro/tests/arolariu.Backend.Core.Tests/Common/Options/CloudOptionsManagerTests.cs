namespace arolariu.Backend.Core.Tests.Common.Options;

using System;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Tests.Shared.TestDoubles;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="CloudOptionsManager"/> ensuring retrieval of cloud (Azure) options and updated monitor values.
/// Naming follows MethodName_Condition_ExpectedResult pattern mandated by repository guidelines.
/// </summary>
[TestClass]
public sealed class CloudOptionsManagerTests
{
  /// <summary>Verifies constructor throws when monitor dependency is null.</summary>
  [TestMethod]
  public void Ctor_NullMonitor_Throws() => Assert.ThrowsExactly<ArgumentNullException>(() => new CloudOptionsManager(null!));

  /// <summary>Ensures returned application options reference current monitor value.</summary>
  [TestMethod]
  public void GetApplicationOptions_ReturnsCurrentValue()
  {
    var azure = new AzureOptions
    {
      JwtIssuer = "issuer",
      JwtAudience = "aud",
      JwtSecret = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEF",
      SqlConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=Test;"
    };
    var monitor = new FakeOptionsMonitor<AzureOptions>(azure);
    var manager = new CloudOptionsManager(monitor);
    var result = manager.GetApplicationOptions();
    Assert.AreSame(azure, result);
    Assert.AreEqual("issuer", result.JwtIssuer);
  }

  /// <summary>Confirms manager reflects updated monitor value after change.</summary>
  [TestMethod]
  public void GetApplicationOptions_ReflectsUpdatedMonitorValue()
  {
    var original = new AzureOptions { ApplicationName = "Original" };
    var updated = new AzureOptions { ApplicationName = "Updated" };
    var monitor = new FakeOptionsMonitor<AzureOptions>(original);
    var manager = new CloudOptionsManager(monitor);
    Assert.AreEqual("Original", manager.GetApplicationOptions().ApplicationName);
    monitor.Set(updated);
    Assert.AreEqual("Updated", manager.GetApplicationOptions().ApplicationName);
  }
}
