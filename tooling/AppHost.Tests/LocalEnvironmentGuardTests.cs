namespace AppHost.Tests;

using LocalDevelopment.Bootstrap;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies local bootstrap targets cannot escape emulator boundaries.
/// </summary>
[TestClass]
public sealed class LocalEnvironmentGuardTests
{
  private const string EmulatorCosmosConnection =
    "AccountEndpoint=https://localhost:8081/;AccountKey=emulator;";

  /// <summary>
  /// Verifies the approved local emulator combination is accepted.
  /// </summary>
  [TestMethod]
  public void Validate_LocalEmulators_ReturnsNormally()
  {
    LocalEnvironmentGuard.Validate(
      environmentName: "Development",
      infra: "local",
      azureClientId: null,
      cosmosConnectionString: EmulatorCosmosConnection,
      blobStorageConnectionString: "UseDevelopmentStorage=true",
      queueStorageConnectionString: "UseDevelopmentStorage=true");
  }

  /// <summary>
  /// Verifies non-local runtime gates are rejected.
  /// </summary>
  [TestMethod]
  [DataRow("Production", "local", null)]
  [DataRow("Development", "azure", null)]
  [DataRow("Development", "local", "managed-identity")]
  public void Validate_NonLocalGate_ThrowsInvalidOperationException(
    string environmentName,
    string infra,
    string? azureClientId)
  {
    Assert.ThrowsExactly<InvalidOperationException>(() =>
      LocalEnvironmentGuard.Validate(
        environmentName,
        infra,
        azureClientId,
        EmulatorCosmosConnection,
        "UseDevelopmentStorage=true",
        "UseDevelopmentStorage=true"));
  }

  /// <summary>
  /// Verifies a remote Cosmos endpoint is rejected even with an account key.
  /// </summary>
  [TestMethod]
  public void Validate_RemoteCosmosEndpoint_ThrowsInvalidOperationException()
  {
    Assert.ThrowsExactly<InvalidOperationException>(() =>
      LocalEnvironmentGuard.Validate(
        "Development",
        "local",
        azureClientId: null,
        "AccountEndpoint=https://example.documents.azure.com/;AccountKey=value;",
        "UseDevelopmentStorage=true",
        "UseDevelopmentStorage=true"));
  }
}
