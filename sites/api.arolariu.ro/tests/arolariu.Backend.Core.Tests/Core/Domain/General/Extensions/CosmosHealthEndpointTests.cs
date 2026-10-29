namespace arolariu.Backend.Core.Tests.Core.Domain.General.Extensions;

using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Core.Domain.General.Extensions;

using Azure.Core;

using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
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

  /// <summary>The registered cloud check uses the shared authenticated client within the application database.</summary>
  /// <param name="statusCode">The external Cosmos operation result.</param>
  /// <param name="expected">The resulting dependency health state.</param>
  [TestMethod]
  [DataRow(HttpStatusCode.OK, HealthStatus.Healthy)]
  [DataRow(HttpStatusCode.Forbidden, HealthStatus.Unhealthy)]
  public async Task AddCosmosHealthCheck_CloudDatabaseAccess_ReportsAuthenticatedResult(
      HttpStatusCode statusCode, HealthStatus expected)
  {
    using var handler = new CosmosHttpHandler(statusCode);
    using var httpClient = new HttpClient(handler);
    var credential = new FixtureCredential();
    using var client = new CosmosClient("https://account.documents.azure.com/", credential, new CosmosClientOptions
    {
      ConnectionMode = ConnectionMode.Gateway,
      LimitToEndpoint = true,
      HttpClientFactory = () => httpClient,
    });

    var services = new ServiceCollection();
    services.AddLogging();
    services.AddSingleton(client);
    WebApplicationBuilderExtensions.AddCosmosHealthCheck(
      services.AddHealthChecks(), new Uri("https://account.documents.azure.com/"));
    using var provider = services.BuildServiceProvider();
    var registration = provider.GetRequiredService<IOptions<HealthCheckServiceOptions>>()
      .Value.Registrations.Single(value => value.Name == "cosmosdb");

    Assert.AreEqual(TimeSpan.FromSeconds(10), registration.Timeout);
    Assert.IsInstanceOfType<CosmosDbHealthCheck>(registration.Factory(provider));
    var report = await provider.GetRequiredService<HealthCheckService>().CheckHealthAsync().ConfigureAwait(false);

    var entry = report.Entries["cosmosdb"];
    Assert.AreEqual(expected, entry.Status, entry.Exception?.ToString());
    Assert.AreEqual(1, handler.DatabaseReads, entry.Exception?.ToString());
    Assert.IsTrue(handler.CancellationAvailable);
    Assert.IsTrue(credential.TokenRequests > 0);
    StringAssert.Contains(Uri.UnescapeDataString(handler.Authorization), "type=aad", StringComparison.Ordinal);
  }

  private sealed class FixtureCredential : TokenCredential
  {
    public int TokenRequests { get; private set; }

    public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      TokenRequests++;
      return new AccessToken("fixture-access-token", DateTimeOffset.UtcNow.AddMinutes(10));
    }

    public override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken)
      => ValueTask.FromResult(GetToken(requestContext, cancellationToken));
  }

  private sealed class CosmosHttpHandler(HttpStatusCode databaseStatus) : HttpMessageHandler
  {
    public int DatabaseReads { get; private set; }
    public bool CancellationAvailable { get; private set; }
    public string Authorization { get; private set; } = string.Empty;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      var status = HttpStatusCode.OK;
      string body;
      if (request.RequestUri?.AbsolutePath == "/")
      {
        body = """
          {"id":"fixture","writableLocations":[{"name":"West Europe","databaseAccountEndpoint":"https://account.documents.azure.com/"}],
          "readableLocations":[{"name":"West Europe","databaseAccountEndpoint":"https://account.documents.azure.com/"}],
          "userConsistencyPolicy":{"defaultConsistencyLevel":"Session"}}
          """;
      }
      else if (request.RequestUri?.AbsolutePath.TrimEnd('/') == "/dbs/primary")
      {
        DatabaseReads++;
        CancellationAvailable = cancellationToken.CanBeCanceled;
        Authorization = request.Headers.GetValues("authorization").Single();
        status = databaseStatus;
        body = status == HttpStatusCode.OK
          ? """{"id":"primary"}"""
          : """{"code":"Forbidden","message":"Fixture access denied."}""";
      }
      else
      {
        throw new InvalidOperationException("Unexpected Cosmos health-check request.");
      }

      return Task.FromResult(new HttpResponseMessage(status)
      {
        Content = new StringContent(body, Encoding.UTF8, "application/json"),
      });
    }
  }
}
