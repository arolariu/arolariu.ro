namespace LocalDevelopment.Tests.Identity;

using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Executes real Minimal API route delegates without opening a listening socket.</summary>
[TestClass]
public sealed class LocalIdentityEndpointTests
{
  /// <summary>Verifies the readiness response remains the same JSON contract.</summary>
  [TestMethod]
  public async Task Health_Always_ReturnsHealthyJson()
  {
    await using var fixture = new IdentityApplication();
    DefaultHttpContext context = await fixture.InvokeAsync("/health");
    Assert.AreEqual(200, context.Response.StatusCode);
    using JsonDocument json = ReadBody(context);
    Assert.AreEqual("healthy", json.RootElement.GetProperty("status").GetString());
    Assert.AreEqual(1, json.RootElement.EnumerateObject().Count());
  }

  /// <summary>Verifies all persona fields and catalog order remain stable.</summary>
  [TestMethod]
  public async Task Personas_Always_ReturnsFixedCatalogShape()
  {
    await using var fixture = new IdentityApplication();
    using JsonDocument json = ReadBody(await fixture.InvokeAsync("/personas"));
    JsonElement[] personas = json.RootElement.EnumerateArray().ToArray();
    Assert.HasCount(3, personas);
    CollectionAssert.AreEqual(new[] { "alice", "bob", "charlie" },
      personas.Select(persona => persona.GetProperty("key").GetString()).ToArray());
    foreach (JsonElement persona in personas)
    {
      CollectionAssert.AreEquivalent(new[] { "key", "displayName", "subject", "userIdentifier", "role" },
        persona.EnumerateObject().Select(property => property.Name).ToArray());
      Assert.AreEqual("user", persona.GetProperty("role").GetString());
    }
  }

  /// <summary>Verifies signed token response shape and no-store without changing claims.</summary>
  [TestMethod]
  public async Task Token_KnownPersona_ReturnsSignedTokenAndNoStore()
  {
    await using var fixture = new IdentityApplication();
    DefaultHttpContext context = await fixture.InvokeAsync("/personas/{key}/token", "alice");
    Assert.AreEqual(200, context.Response.StatusCode);
    Assert.AreEqual("no-store", context.Response.Headers.CacheControl.ToString());
    using JsonDocument json = ReadBody(context);
    Assert.AreEqual("alice", json.RootElement.GetProperty("persona").GetString());
    Assert.AreEqual(2, json.RootElement.EnumerateObject().Count());
    JwtSecurityToken token = new JwtSecurityTokenHandler().ReadJwtToken(json.RootElement.GetProperty("token").GetString());
    Assert.AreEqual("alice@arolariu.ro", token.Subject);
    Assert.AreEqual("HS256", token.Header.Alg);
    Assert.AreEqual("issuer", token.Issuer);
    CollectionAssert.AreEqual(new[] { "audience" }, token.Audiences.ToArray());
    Assert.AreEqual(TimeSpan.FromHours(8), token.ValidTo - token.ValidFrom);
  }

  /// <summary>Verifies unknown personas stay uncached and return not found.</summary>
  [TestMethod]
  public async Task Token_UnknownPersona_ReturnsNotFoundAndNoStore()
  {
    await using var fixture = new IdentityApplication();
    DefaultHttpContext context = await fixture.InvokeAsync("/personas/{key}/token", "unknown");
    Assert.AreEqual(404, context.Response.StatusCode);
    Assert.AreEqual("no-store", context.Response.Headers.CacheControl.ToString());
  }

  /// <summary>Verifies the configured Swagger origin is the only CORS origin.</summary>
  [TestMethod]
  public async Task Cors_Startup_PreservesOriginMethodAndHeaderPolicy()
  {
    await using var fixture = new IdentityApplication();
    CorsOptions options = fixture.Application.Services.GetRequiredService<IOptions<CorsOptions>>().Value;
    CorsPolicy policy = options.GetPolicy(options.DefaultPolicyName)
      ?? throw new InvalidOperationException("CORS policy is required.");
    CollectionAssert.AreEqual(new[] { "http://localhost:5000" }, policy.Origins.ToArray());
    CollectionAssert.AreEqual(new[] { "GET" }, policy.Methods.ToArray());
    Assert.IsTrue(policy.AllowAnyHeader);
    Assert.IsFalse(policy.AllowAnyOrigin);
  }

  private static JsonDocument ReadBody(DefaultHttpContext context)
  {
    context.Response.Body.Position = 0;
    return JsonDocument.Parse(context.Response.Body);
  }

  private sealed class IdentityApplication : IAsyncDisposable
  {
    private readonly string path = Path.GetTempFileName();
    internal WebApplication Application { get; }
    internal IdentityApplication()
    {
      File.WriteAllText(path,
        """{"Auth:JWT:Issuer":"issuer","Auth:JWT:Audience":"audience","Auth:JWT:Secret":"local-test-secret-at-least-thirty-two-bytes"}""");
      WebApplicationBuilder builder = WebApplication.CreateBuilder(new WebApplicationOptions
      {
        Args = [],
        EnvironmentName = "Development",
      });
      builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
      {
        ["LOCAL_CONFIG_PATH"] = path,
        ["LOCAL_SWAGGER_ORIGIN"] = "http://localhost:5000",
        ["urls"] = "http://localhost:5011",
      });
      Application = global::LocalDevelopment.Identity.Program.BuildApplication(builder);
    }
    internal async Task<DefaultHttpContext> InvokeAsync(string route, string? key = null)
    {
      RouteEndpoint endpoint = ((IEndpointRouteBuilder)Application).DataSources
        .SelectMany(source => source.Endpoints).OfType<RouteEndpoint>()
        .Single(candidate => candidate.RoutePattern.RawText == route);
      var context = new DefaultHttpContext { RequestServices = Application.Services };
      context.Request.Method = "GET";
      context.Response.Body = new MemoryStream();
      if (key is not null) { context.Request.RouteValues["key"] = key; }
      context.SetEndpoint(endpoint);
      RequestDelegate handler = endpoint.RequestDelegate
        ?? throw new InvalidOperationException("Route delegate is required.");
      await handler(context);
      return context;
    }
    public async ValueTask DisposeAsync()
    {
      await Application.DisposeAsync();
      File.Delete(path);
    }
  }
}
