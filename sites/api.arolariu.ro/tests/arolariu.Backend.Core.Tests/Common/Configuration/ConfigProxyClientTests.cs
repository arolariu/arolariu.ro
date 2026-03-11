namespace arolariu.Backend.Core.Tests.Common.Configuration;

using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Configuration;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="ConfigProxyClient"/> verifying that the v1 config endpoint is
/// called and parsed correctly, including optional label support.
/// </summary>
[TestClass]
public sealed class ConfigProxyClientTests
{
  private static readonly Uri BaseUri = new("http://exp");

  /// <summary>Verifies that a valid JSON response is correctly deserialised into a ConfigValueResponse.</summary>
  [TestMethod]
  public async Task GetConfigValueAsync_ValidResponse_ReturnsConfigValue()
  {
#pragma warning disable CA2000 // handler is disposed via HttpClient (disposeHandler: true)
    using var httpClient = MakeClient(
      HttpStatusCode.OK,
      """{"name":"Endpoints:Api","value":"https://api.arolariu.ro","availableForTargets":["website"],"availableInDocuments":["website.build-time","website.run-time"],"requiredInDocuments":["website.build-time","website.run-time"],"description":"API endpoint","usage":"Server-only","refreshIntervalSeconds":300,"fetchedAt":"2026-01-01T00:00:00Z"}""",
      out var handler);
#pragma warning restore CA2000
    var client = new ConfigProxyClient(httpClient, NullLogger<ConfigProxyClient>.Instance);

    var result = await client.GetConfigValueAsync("Endpoints:Api").ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("/api/v1/config?name=Endpoints%3AApi", handler.LastRequestUri?.PathAndQuery);
    Assert.IsTrue(handler.LastRequestHeaders.TryGetValues("X-Request-Id", out var requestIds));
    Assert.IsTrue(requestIds.Any());
    Assert.AreEqual("Endpoints:Api", result.Name);
    Assert.AreEqual("https://api.arolariu.ro", result.Value);
  }

  /// <summary>Verifies that the label is appended to the query string when provided.</summary>
  [TestMethod]
  public async Task GetConfigValueAsync_WithLabel_AppendsLabelToUri()
  {
#pragma warning disable CA2000
    using var httpClient = MakeClient(
      HttpStatusCode.OK,
      """{"name":"Auth:JWT:Secret","value":"secret-value","availableForTargets":["api"],"availableInDocuments":["api.build-time"],"requiredInDocuments":["api.build-time"],"description":"JWT secret","usage":"Server-only","refreshIntervalSeconds":300,"fetchedAt":"2026-01-01T00:00:00Z"}""",
      out var handler);
#pragma warning restore CA2000
    var client = new ConfigProxyClient(httpClient, NullLogger<ConfigProxyClient>.Instance);

    var result = await client.GetConfigValueAsync("Auth:JWT:Secret", label: "PRODUCTION").ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("/api/v1/config?name=Auth%3AJWT%3ASecret&label=PRODUCTION", handler.LastRequestUri?.PathAndQuery);
    Assert.IsTrue(handler.LastRequestHeaders.TryGetValues("X-Request-Id", out var requestIds));
    Assert.IsTrue(requestIds.Any());
    Assert.AreEqual("secret-value", result.Value);
  }

  /// <summary>Verifies that the label is omitted from the query string when null.</summary>
  [TestMethod]
  public async Task GetConfigValueAsync_NullLabel_NoLabelInUri()
  {
#pragma warning disable CA2000
    using var httpClient = MakeClient(
      HttpStatusCode.OK,
      """{"name":"Some:Key","value":"val","availableForTargets":["api"],"availableInDocuments":["api.build-time"],"requiredInDocuments":["api.build-time"],"description":"desc","usage":"Server-only","refreshIntervalSeconds":300,"fetchedAt":"2026-01-01T00:00:00Z"}""",
      out var handler);
#pragma warning restore CA2000
    var client = new ConfigProxyClient(httpClient, NullLogger<ConfigProxyClient>.Instance);

    var result = await client.GetConfigValueAsync("Some:Key", label: null).ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("/api/v1/config?name=Some%3AKey", handler.LastRequestUri?.PathAndQuery);
    Assert.IsFalse(handler.LastRequestUri?.PathAndQuery.Contains("label", StringComparison.Ordinal));
  }

  /// <summary>Verifies that a 404 response results in a null return value.</summary>
  [TestMethod]
  public async Task GetConfigValueAsync_NotFound_ReturnsNull()
  {
    using var httpClient = MakeClient(HttpStatusCode.NotFound, "{}", out _);
    var client = new ConfigProxyClient(httpClient, NullLogger<ConfigProxyClient>.Instance);

    var result = await client.GetConfigValueAsync("Missing:Config").ConfigureAwait(false);

    Assert.IsNull(result);
  }

  /// <summary>Verifies that invalid JSON in a 200 response results in a null return value.</summary>
  [TestMethod]
  public async Task GetConfigValueAsync_InvalidJson_ReturnsNull()
  {
    using var httpClient = MakeClient(HttpStatusCode.OK, "not-json", out _);
    var client = new ConfigProxyClient(httpClient, NullLogger<ConfigProxyClient>.Instance);

    var result = await client.GetConfigValueAsync("Some:Key").ConfigureAwait(false);

    Assert.IsNull(result);
  }

  /// <summary>Verifies that a 503 response results in a null return value.</summary>
  [TestMethod]
  public async Task GetConfigValueAsync_ServiceUnavailable_ReturnsNull()
  {
    using var httpClient = MakeClient(HttpStatusCode.ServiceUnavailable, "", out _);
    var client = new ConfigProxyClient(httpClient, NullLogger<ConfigProxyClient>.Instance);

    var result = await client.GetConfigValueAsync("Some:Key").ConfigureAwait(false);

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
    public HttpRequestHeaders LastRequestHeaders { get; private set; } = new HttpRequestMessage().Headers;

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
      LastRequestUri = request.RequestUri;
      LastRequestHeaders = request.Headers;

      return Task.FromResult(new HttpResponseMessage(status)
      {
        Content = new StringContent(body, Encoding.UTF8, "application/json"),
      });
    }
  }
}
