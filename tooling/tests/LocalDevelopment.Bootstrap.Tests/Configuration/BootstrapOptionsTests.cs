namespace LocalDevelopment.Bootstrap.Tests.Configuration;

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
    Assert.AreEqual(Path.Combine(AppContext.BaseDirectory, "SeedData"), options.SeedDataDirectory);
  }

  /// <summary>Verifies the ASP.NET environment is used only when DOTNET is absent.</summary>
  [TestMethod]
  public void FromEnvironment_AspnetEnvironment_ProvidesFallback()
  {
    var values = StorageValues();
    values["ASPNETCORE_ENVIRONMENT"] = "Development";
    values["SEED_DATA_DIRECTORY"] = "custom-fixtures";
    BootstrapOptions options = BootstrapOptions.FromEnvironment(key => values.GetValueOrDefault(key));
    Assert.AreEqual("Development", options.EnvironmentName);
    Assert.AreEqual("custom-fixtures", options.SeedDataDirectory);
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

  /// <summary>Verifies obsolete file overrides cannot silently select another dataset.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public void FromEnvironment_LegacyManifestOverride_ThrowsMigrationGuidance(bool includeDirectory)
  {
    var values = StorageValues();
    values["SEED_MANIFEST_PATH"] = "scenario.v1.json";
    if (includeDirectory) { values["SEED_DATA_DIRECTORY"] = "SeedData"; }

    InvalidOperationException exception = Assert.ThrowsExactly<InvalidOperationException>(() =>
      BootstrapOptions.FromEnvironment(values.GetValueOrDefault));

    StringAssert.Contains(exception.Message, "SEED_DATA_DIRECTORY");
  }

  /// <summary>An explicitly blank directory cannot fall back to another source bundle.</summary>
  [TestMethod]
  public void FromEnvironment_BlankDirectory_ThrowsInvalidOperationException()
  {
    var values = StorageValues();
    values["SEED_DATA_DIRECTORY"] = " ";
    Assert.ThrowsExactly<InvalidOperationException>(() => BootstrapOptions.FromEnvironment(values.GetValueOrDefault));
  }

  private static Dictionary<string, string> StorageValues() => new()
  {
    ["INFRA"] = "local",
    ["ConnectionStrings__blobs"] = "UseDevelopmentStorage=true",
    ["ConnectionStrings__queues"] = "UseDevelopmentStorage=true",
  };
}
