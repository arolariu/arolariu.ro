namespace arolariu.Backend.Core.Tests.Core.Swagger;

using System;
using System.Collections.Generic;

using arolariu.Backend.Core.Domain.General.Services.Swagger;

using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the local-only Swagger persona bridge.
/// </summary>
[TestClass]
public sealed class LocalDevelopmentSwaggerTests
{
  /// <summary>
  /// Verifies all local safety gates enable the selector.
  /// </summary>
  [TestMethod]
  public void Resolve_AllLocalGatesPresent_EnablesPersonaControls()
  {
    LocalDevelopmentSwaggerOptions options = LocalDevelopmentSwagger.Resolve(
      CreateEnvironment(Environments.Development),
      CreateConfiguration(
        infra: "local",
        azureClientId: null,
        identityUrl: "http://127.0.0.1:5123"));

    Assert.IsTrue(options.Enabled);
    Assert.AreEqual(
      new Uri("http://127.0.0.1:5123"),
      options.IdentityEndpoint);
  }

  /// <summary>
  /// Verifies unsafe runtime combinations disable persona controls.
  /// </summary>
  [TestMethod]
  [DataRow("Production", "local", null)]
  [DataRow("Development", "azure", null)]
  [DataRow("Development", "local", "managed-identity")]
  public void Resolve_UnsafeGate_DisablesPersonaControls(
    string environment,
    string infra,
    string? azureClientId)
  {
    LocalDevelopmentSwaggerOptions options = LocalDevelopmentSwagger.Resolve(
      CreateEnvironment(environment),
      CreateConfiguration(
        infra,
        azureClientId,
        "http://127.0.0.1:5123"));

    Assert.IsFalse(options.Enabled);
    Assert.IsNull(options.IdentityEndpoint);
  }

  /// <summary>
  /// Verifies a non-loopback identity helper is rejected.
  /// </summary>
  [TestMethod]
  public void Resolve_RemoteIdentityUrl_DisablesPersonaControls()
  {
    LocalDevelopmentSwaggerOptions options = LocalDevelopmentSwagger.Resolve(
      CreateEnvironment(Environments.Development),
      CreateConfiguration(
        "local",
        azureClientId: null,
        "https://identity.example.test"));

    Assert.IsFalse(options.Enabled);
  }

  /// <summary>
  /// Verifies the generated selector uses Swagger's Bearer preauthorization.
  /// </summary>
  [TestMethod]
  public void CreateScript_ValidIdentityEndpoint_RendersPersonaSelectorAndBearerPreauthorization()
  {
    string script = LocalDevelopmentSwagger.CreateScript(
      new Uri("http://127.0.0.1:5123"));

    StringAssert.Contains(script, "/personas", StringComparison.Ordinal);
    StringAssert.Contains(script, "/token", StringComparison.Ordinal);
    StringAssert.Contains(script, "preauthorizeApiKey", StringComparison.Ordinal);
    StringAssert.Contains(script, "\"Bearer\"", StringComparison.Ordinal);
    StringAssert.Contains(script, "\"aria-live\"", StringComparison.Ordinal);
    StringAssert.Contains(script, "\"polite\"", StringComparison.Ordinal);
    Assert.IsFalse(script.Contains("console.", StringComparison.Ordinal));
  }

  /// <summary>
  /// Verifies the local identity origin is added to Swagger's connection policy.
  /// </summary>
  [TestMethod]
  public void CreateContentSecurityPolicy_LocalIdentityEndpoint_AllowsOrigin()
  {
    string policy = LocalDevelopmentSwagger.CreateContentSecurityPolicy(
      new Uri("http://127.0.0.1:5123/personas"));

    StringAssert.Contains(
      policy,
      "connect-src 'self' http://127.0.0.1:5123;",
      StringComparison.Ordinal);
  }

  private static IConfiguration CreateConfiguration(
    string infra,
    string? azureClientId,
    string identityUrl) =>
    new ConfigurationBuilder()
      .AddInMemoryCollection(new Dictionary<string, string?>
      {
        ["INFRA"] = infra,
        ["AZURE_CLIENT_ID"] = azureClientId,
        ["LOCAL_DEVELOPMENT_IDENTITY_URL"] = identityUrl,
      })
      .Build();

  private static TestWebHostEnvironment CreateEnvironment(string name) =>
    new TestWebHostEnvironment
    {
      EnvironmentName = name,
    };

  private sealed class TestWebHostEnvironment : IWebHostEnvironment
  {
    public string ApplicationName { get; set; } = "Tests";

    public IFileProvider WebRootFileProvider { get; set; } =
      new NullFileProvider();

    public string WebRootPath { get; set; } = string.Empty;

    public string EnvironmentName { get; set; } = Environments.Development;

    public string ContentRootPath { get; set; } = string.Empty;

    public IFileProvider ContentRootFileProvider { get; set; } =
      new NullFileProvider();
  }
}
