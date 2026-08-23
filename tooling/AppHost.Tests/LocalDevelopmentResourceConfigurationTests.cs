namespace AppHost.Tests;

using AppHost.Aspire;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies environment values injected into local-only Aspire resources.
/// </summary>
[TestClass]
public sealed class LocalDevelopmentResourceConfigurationTests
{
  /// <summary>
  /// Verifies the bootstrap resource receives every destructive-operation gate.
  /// </summary>
  [TestMethod]
  public void CreateBootstrapEnvironment_Always_ContainsLocalSafetyGates()
  {
    IReadOnlyDictionary<string, string> environment =
      LocalDevelopmentResourceConfiguration.CreateBootstrapEnvironment(
        manifestPath: "SeedData/scenario.v1.json");

    Assert.AreEqual("Development", environment["DOTNET_ENVIRONMENT"]);
    Assert.AreEqual("local", environment["INFRA"]);
    Assert.AreEqual(
      "SeedData/scenario.v1.json",
      environment["SEED_MANIFEST_PATH"]);
    Assert.IsFalse(environment.ContainsKey("AZURE_CLIENT_ID"));
  }

  /// <summary>
  /// Verifies the identity resource receives only local config and Swagger origins.
  /// </summary>
  [TestMethod]
  public void CreateIdentityEnvironment_ValidInputs_ReturnsExpectedPaths()
  {
    IReadOnlyDictionary<string, string> environment =
      LocalDevelopmentResourceConfiguration.CreateIdentityEnvironment(
        configPath: @"C:\repo\config.aspire.json",
        swaggerOrigin: "http://localhost:5000");

    Assert.AreEqual(
      @"C:\repo\config.aspire.json",
      environment["LOCAL_CONFIG_PATH"]);
    Assert.AreEqual(
      "http://localhost:5000",
      environment["LOCAL_SWAGGER_ORIGIN"]);
  }
}
