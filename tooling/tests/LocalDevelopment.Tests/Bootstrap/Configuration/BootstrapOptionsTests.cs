namespace LocalDevelopment.Tests.Bootstrap.Configuration;

using global::LocalDevelopment.Bootstrap.Configuration;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies option resolution without mutating process environment.</summary>
[TestClass]
public sealed class BootstrapOptionsTests
{
  /// <summary>Verifies explicit environment precedence and copied-fixture defaults.</summary>
  [TestMethod]
  public void FromEnvironment_DotnetEnvironment_TakesPrecedenceAndDefaultsManifest()
  {
    var values = StorageValues();
    values["DOTNET_ENVIRONMENT"] = "Development";
    values["ASPNETCORE_ENVIRONMENT"] = "Production";
    BootstrapOptions options = BootstrapOptions.FromEnvironment(key => values.GetValueOrDefault(key));
    Assert.AreEqual("Development", options.EnvironmentName);
    Assert.AreEqual("local", options.Infra);
    Assert.IsNull(options.CosmosConnectionString);
    Assert.AreEqual(Path.Combine(AppContext.BaseDirectory, "SeedData", "scenario.v1.json"), options.ManifestPath);
  }

  /// <summary>Verifies the ASP.NET environment is used only when DOTNET is absent.</summary>
  [TestMethod]
  public void FromEnvironment_AspnetEnvironment_ProvidesFallback()
  {
    var values = StorageValues();
    values["ASPNETCORE_ENVIRONMENT"] = "Development";
    values["SEED_MANIFEST_PATH"] = "custom-fixture.json";
    BootstrapOptions options = BootstrapOptions.FromEnvironment(key => values.GetValueOrDefault(key));
    Assert.AreEqual("Development", options.EnvironmentName);
    Assert.AreEqual("custom-fixture.json", options.ManifestPath);
  }

  /// <summary>Verifies required storage inputs fail explicitly.</summary>
  [TestMethod]
  [DataRow("ConnectionStrings__blobs")]
  [DataRow("ConnectionStrings__queues")]
  public void FromEnvironment_MissingStorageConnection_ThrowsInvalidOperationException(string key)
  {
    var values = StorageValues();
    values.Remove(key);
    InvalidOperationException exception = Assert.ThrowsExactly<InvalidOperationException>(() =>
      BootstrapOptions.FromEnvironment(name => values.GetValueOrDefault(name)));
    StringAssert.Contains(exception.Message, key);
  }

  private static Dictionary<string, string> StorageValues() => new()
  {
    ["INFRA"] = "local",
    ["ConnectionStrings__blobs"] = "UseDevelopmentStorage=true",
    ["ConnectionStrings__queues"] = "UseDevelopmentStorage=true",
  };
}
