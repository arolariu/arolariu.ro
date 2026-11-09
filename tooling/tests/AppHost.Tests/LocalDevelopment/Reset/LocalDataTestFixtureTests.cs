namespace AppHost.Tests.LocalDevelopment.Reset;

using System.Text.Json;
using global::LocalDevelopment.Tests;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Proves destructive test cleanup is gated on actual scoped engine port bindings.</summary>
[TestClass]
public sealed class LocalDataTestFixtureTests
{
  private const string Scope = "arolariu-seed-tests-binding-proof";

  /// <summary>Both Docker and Podman name formats accept the same correctly owned endpoint.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public void VerifyInspection_OptionalNameSlash_AcceptsOwnedBinding(bool slash)
  {
    using JsonDocument inspection = CreateInspection(slash);

    LocalDataTestFixture.VerifyInspection(inspection.RootElement, Scope, ("cosmos", "8081/tcp", "18083"));
  }

  /// <summary>Podman's slashless names cannot bypass host or port validation.</summary>
  [TestMethod]
  [DataRow("0.0.0.0", "18083")]
  [DataRow("127.0.0.1", "8081")]
  public void VerifyInspection_PodmanNameWithUnrelatedHostOrPort_Refuses(string host, string port)
  {
    using JsonDocument inspection = CreateInspection(false, host, port);

    Assert.ThrowsExactly<AssertFailedException>(() =>
      LocalDataTestFixture.VerifyInspection(inspection.RootElement, Scope, ("cosmos", "8081/tcp", "18083")));
  }

  /// <summary>Correct labels and volume prefixes do not excuse an unmatched container name.</summary>
  [TestMethod]
  public void VerifyInspection_NoMatchingRequestedService_Refuses()
  {
    using JsonDocument inspection = CreateInspection(false, name: $"{Scope}-unrelated");

    Assert.ThrowsExactly<AssertFailedException>(() =>
      LocalDataTestFixture.VerifyInspection(inspection.RootElement, Scope, ("cosmos", "8081/tcp", "18083")));
  }

  /// <summary>A container without the requested mapping cannot authorize fixed-endpoint cleanup.</summary>
  [TestMethod]
  public void VerifyInspection_MissingRequestedBinding_Refuses()
  {
    using JsonDocument inspection = CreateInspection(false, containerPort: "9999/tcp");

    Assert.ThrowsExactly<AssertFailedException>(() =>
      LocalDataTestFixture.VerifyInspection(inspection.RootElement, Scope, ("cosmos", "8081/tcp", "18083")));
  }

  private static JsonDocument CreateInspection(bool slash, string host = "127.0.0.1", string port = "18083",
    string? name = null, string containerPort = "8081/tcp") =>
    JsonDocument.Parse(JsonSerializer.Serialize(new[]
    {
      new
      {
        Name = name ?? $"{(slash ? "/" : string.Empty)}{Scope}-cosmos",
        State = new { Running = true },
        Config = new { Labels = new Dictionary<string, string> { ["com.docker.compose.project"] = Scope } },
        Mounts = new[] { new { Type = "volume", Name = $"{Scope}-cosmos" } },
        NetworkSettings = new
        {
          Ports = new Dictionary<string, object> { [containerPort] = new[] { new { HostIp = host, HostPort = port } } },
        },
      },
    }));
}
