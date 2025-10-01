namespace arolariu.Backend.Core.Tests.Common.Options;

using System;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Tests.Shared.TestDoubles;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class LocalOptionsManagerTests
{
  [TestMethod]
  public void Ctor_NullMonitor_Throws()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => new LocalOptionsManager(null!));
  }

  [TestMethod]
  public void GetApplicationOptions_ReturnsCurrentValue()
  {
    var local = new LocalOptions
    {
      ApplicationName = "Dev API",
      SqlConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=Dev;",
      NoSqlConnectionString = "AccountEndpoint=https://localhost:8081/;AccountKey=XYZ;",
      StorageAccountEndpoint = "http://127.0.0.1:10000/devstoreaccount1",
      JwtIssuer = "local-issuer",
      JwtAudience = "local-audience",
      JwtSecret = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEF"
    };

    var monitor = new FakeOptionsMonitor<LocalOptions>(local);
    var manager = new LocalOptionsManager(monitor);

    var result = manager.GetApplicationOptions();

    Assert.AreSame(local, result);
    Assert.AreEqual("Dev API", result.ApplicationName);
    Assert.AreEqual("local-issuer", result.JwtIssuer);
    Assert.AreEqual("local-audience", result.JwtAudience);
  }

  [TestMethod]
  public void GetApplicationOptions_ReflectsUpdatedMonitorValue()
  {
    var original = new LocalOptions { ApplicationName = "Original Local" };
    var updated = new LocalOptions { ApplicationName = "Updated Local" };

    var monitor = new FakeOptionsMonitor<LocalOptions>(original);
    var manager = new LocalOptionsManager(monitor);

    Assert.AreEqual("Original Local", manager.GetApplicationOptions().ApplicationName);

    monitor.Set(updated);

    Assert.AreEqual("Updated Local", manager.GetApplicationOptions().ApplicationName);
  }
}
