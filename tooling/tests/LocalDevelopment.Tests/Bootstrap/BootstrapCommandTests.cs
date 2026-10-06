namespace LocalDevelopment.Tests.Bootstrap;

using global::LocalDevelopment.Bootstrap.Configuration;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies command failures/cancellation do not reach emulator clients.</summary>
[TestClass]
public sealed class BootstrapCommandTests
{
  /// <summary>Verifies cancellation is non-success and precedes environment/SDK work.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public async Task RunAsync_PreCancelled_ReturnsFailureWithoutReadingOptions(bool storageOnly)
  {
    int reads = 0;
    int result = await global::LocalDevelopment.Bootstrap.Program.RunAsync(
      () => { reads++; throw new InvalidOperationException("must not read"); },
      storageOnly, new CancellationToken(true));
    Assert.AreEqual(1, result);
    Assert.AreEqual(0, reads);
  }

  /// <summary>Verifies a remote runtime is rejected without provisioning.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public async Task RunAsync_NonLocalRuntime_ReturnsFailure(bool storageOnly)
  {
    var options = new BootstrapOptions("Production", "local", null,
      "AccountEndpoint=https://localhost:8081/;AccountKey=emulator;",
      "UseDevelopmentStorage=true", "UseDevelopmentStorage=true", "unused");
    int result = await global::LocalDevelopment.Bootstrap.Program.RunAsync(
      () => options, storageOnly, CancellationToken.None);
    Assert.AreEqual(1, result);
  }
}
