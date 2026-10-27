namespace arolariu.Backend.Core.Tests.Core.Domain.General.Extensions;

using System;

using arolariu.Backend.Core.Domain.General.Extensions;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies raw cloud endpoint and existing emulator health-check configuration compatibility.</summary>
[TestClass]
public sealed class CosmosHealthEndpointTests
{
  /// <summary>A raw cloud endpoint must retain the Cosmos health check.</summary>
  [TestMethod]
  public void ResolveCosmosHealthEndpoint_RawCloudEndpoint_ReturnsEndpoint()
  {
    var endpoint = WebApplicationBuilderExtensions.ResolveCosmosHealthEndpoint("https://account.documents.azure.com/");

    Assert.AreEqual(new Uri("https://account.documents.azure.com/"), endpoint);
  }

  /// <summary>Existing keyed emulator configuration still resolves only its endpoint.</summary>
  [TestMethod]
  public void ResolveCosmosHealthEndpoint_LocalConnectionString_ReturnsEndpointWithoutKey()
  {
    var endpoint = WebApplicationBuilderExtensions.ResolveCosmosHealthEndpoint(
      "AccountEndpoint=https://localhost:8081/;AccountKey=synthetic-local-key;");

    Assert.AreEqual(new Uri("https://localhost:8081/"), endpoint);
  }

  /// <summary>Unconfigured or unmatched values preserve the existing no-check behavior.</summary>
  /// <param name="value">An absent or unmatched configuration value.</param>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("not-an-endpoint")]
  public void ResolveCosmosHealthEndpoint_MissingOrUnmatchedValue_ReturnsNull(string? value)
  {
    Assert.IsNull(WebApplicationBuilderExtensions.ResolveCosmosHealthEndpoint(value));
  }
}
