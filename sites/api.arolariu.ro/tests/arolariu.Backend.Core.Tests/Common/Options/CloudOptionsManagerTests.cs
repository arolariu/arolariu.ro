namespace arolariu.Backend.Core.Tests.Common.Options;

using System;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Tests.Shared.TestDoubles;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class CloudOptionsManagerTests
{
  [TestMethod]
  public void Ctor_NullMonitor_Throws()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => new CloudOptionsManager(null!));
  }

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
