namespace arolariu.Backend.Core.Tests.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Configuration;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="ConfigProxyClient"/> verifying that the v1 exp endpoints are
/// called and parsed correctly.
/// </summary>
[TestClass]
public sealed class ConfigProxyClientTests
{
  private static readonly Uri BaseUri = new("http://exp");

  private static string Serialize<T>(T obj) => JsonSerializer.Serialize(obj);

  [TestMethod]
  public async Task GetBuildTimeAsync_SuccessResponse_ReturnsBuildTimePayload()
  {
    var expected = new ConfigCatalogResponse
    {
      Target = "api",
      ContractVersion = "1",
      Version = "v3",
      Config = new Dictionary<string, string> { ["Auth:JWT:Secret"] = "secret-1" },
      RefreshIntervalSeconds = 180,
      FetchedAt = DateTimeOffset.UtcNow,
    };

    using var httpClient = MakeClient(HttpStatusCode.OK, Serialize(expected), out var handler);
    var client = new ConfigProxyClient(httpClient);

    var result = await client.GetBuildTimeAsync("api").ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("/api/v1/build-time?for=api", handler.LastRequestUri?.PathAndQuery);
    Assert.AreEqual("api", result.Target);
    Assert.AreEqual("1", result.ContractVersion);
    Assert.AreEqual("v3", result.Version);
    Assert.AreEqual("secret-1", result.Config["Auth:JWT:Secret"]);
  }

  [TestMethod]
  public async Task GetBuildTimeAsync_NotFoundResponse_ReturnsNull()
  {
    using var httpClient = MakeClient(HttpStatusCode.NotFound, "{}", out _);
    var client = new ConfigProxyClient(httpClient);

    var result = await client.GetBuildTimeAsync("api").ConfigureAwait(false);

    Assert.IsNull(result);
  }

  [TestMethod]
  public async Task GetRunTimeAsync_SuccessResponse_ReturnsRunTimePayload()
  {
    var now = DateTimeOffset.UtcNow;
    var payload = new BootstrapResponse
    {
      Target = "api",
      ContractVersion = "1",
      Version = "v5",
      Config = new Dictionary<string, string> { ["Auth:JWT:Secret"] = "s3cr3t" },
      Features = new Dictionary<string, bool> { ["invoices.analysis"] = true },
      RefreshIntervalSeconds = 240,
      FetchedAt = now,
    };

    using var httpClient = MakeClient(HttpStatusCode.OK, Serialize(payload), out var handler);
    var client = new ConfigProxyClient(httpClient);

    var result = await client.GetRunTimeAsync("api").ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("/api/v1/run-time?for=api", handler.LastRequestUri?.PathAndQuery);
    Assert.AreEqual("v5", result.Version);
    Assert.AreEqual("s3cr3t", result.Config["Auth:JWT:Secret"]);
    Assert.IsTrue(result.Features["invoices.analysis"]);
    Assert.AreEqual(240, result.RefreshIntervalSeconds);
  }

  [TestMethod]
  public async Task GetRunTimeAsync_ServiceUnavailable_ReturnsNull()
  {
    using var httpClient = MakeClient(HttpStatusCode.ServiceUnavailable, "", out _);
    var client = new ConfigProxyClient(httpClient);

    var result = await client.GetRunTimeAsync("api").ConfigureAwait(false);

    Assert.IsNull(result);
  }

  [TestMethod]
  public async Task GetConfigValueAsync_ValidResponse_ReturnsConfigValue()
  {
    using var httpClient = MakeClient(
      HttpStatusCode.OK,
      """{"name":"Endpoints:Api","value":"https://api.arolariu.ro","availableForTargets":["website"],"availableInDocuments":["website.build-time","website.run-time"],"requiredInDocuments":["website.build-time","website.run-time"],"description":"API endpoint","usage":"Server-only","refreshIntervalSeconds":300,"fetchedAt":"2026-01-01T00:00:00Z"}""",
      out var handler);
    var client = new ConfigProxyClient(httpClient);

    var result = await client.GetConfigValueAsync("Endpoints:Api").ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("/api/v1/config?name=Endpoints%3AApi", handler.LastRequestUri?.PathAndQuery);
    Assert.AreEqual("Endpoints:Api", result.Name);
    Assert.AreEqual("https://api.arolariu.ro", result.Value);
  }

  [TestMethod]
  public async Task GetConfigValueAsync_NotFound_ReturnsNull()
  {
    using var httpClient = MakeClient(HttpStatusCode.NotFound, "{}", out _);
    var client = new ConfigProxyClient(httpClient);

    var result = await client.GetConfigValueAsync("Missing:Config").ConfigureAwait(false);

    Assert.IsNull(result);
  }

  private static HttpClient MakeClient(HttpStatusCode status, string body, out FakeHttpHandler handler)
  {
#pragma warning disable CA2000
    handler = new FakeHttpHandler(status, body);
    return new HttpClient(handler, disposeHandler: true) { BaseAddress = BaseUri };
#pragma warning restore CA2000
  }

  private sealed class FakeHttpHandler(HttpStatusCode status, string body) : HttpMessageHandler
  {
    public Uri? LastRequestUri { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
      LastRequestUri = request.RequestUri;

      return Task.FromResult(new HttpResponseMessage(status)
      {
        Content = new StringContent(body, Encoding.UTF8, "application/json"),
      });
    }
  }
}
