namespace AppHost.Tests;

using AppHost.Aspire;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the local Azurite bootstrap connection contract.
/// </summary>
[TestClass]
public sealed class AzuriteBootstrapTests
{
  /// <summary>
  /// Verifies the bootstrap connection string targets both Azurite services.
  /// </summary>
  [TestMethod]
  public void CreateConnectionString_ValidPorts_ContainsBlobAndQueueEndpoints()
  {
    string connectionString = AzuriteBootstrap.CreateConnectionString(
      blobPort: 10000,
      queuePort: 10001);

    StringAssert.Contains(
      connectionString,
      "BlobEndpoint=http://localhost:10000/devstoreaccount1");
    StringAssert.Contains(
      connectionString,
      "QueueEndpoint=http://localhost:10001/devstoreaccount1");
  }

  /// <summary>
  /// Verifies non-positive service ports are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(0, 10001)]
  [DataRow(10000, 0)]
  public void CreateConnectionString_NonPositivePort_ThrowsArgumentOutOfRangeException(
    int blobPort,
    int queuePort)
  {
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(
      () => AzuriteBootstrap.CreateConnectionString(blobPort, queuePort));
  }
}
