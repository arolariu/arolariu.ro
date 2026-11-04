namespace LocalDevelopment.Identity.Tests.Personas;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

using global::LocalDevelopment.Identity.Configuration;
using global::LocalDevelopment.Identity.Personas;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies local persona JWTs preserve the production validation contract.
/// </summary>
[TestClass]
public sealed class DevelopmentTokenFactoryTests
{
  private static readonly DateTimeOffset Anchor =
    new(2026, 8, 21, 12, 0, 0, TimeSpan.Zero);

  private static readonly LocalIdentityOptions Options = new(
    Issuer: "https://auth.arolariu.ro",
    Audience: "https://api.arolariu.ro",
    Secret: "local-test-secret-at-least-thirty-two-bytes",
    SwaggerOrigin: "http://localhost:5000");

  /// <summary>
  /// Verifies Alice's token validates and carries the exact API claims.
  /// </summary>
  [TestMethod]
  [DataRow("alice", "7574070c-3ee9-5031-9b1b-0dc08c61ee86")]
  [DataRow("bob", "6a40503e-c1af-51b0-8b60-3c6648b3724e")]
  [DataRow("charlie", "fc687d5c-39d5-5541-868c-f76a3fdbd4e4")]
  [DataRow("dmitryi", "2e92f011-8157-564d-a059-af27f4026fd6")]
  public void Create_KnownPersona_ReturnsValidSignedTokenWithExpectedClaims(string key, string websiteIdentifier)
  {
    var timeProvider = new FixedTimeProvider(Anchor);
    var factory = new DevelopmentTokenFactory(
      Options,
      timeProvider);

    DevelopmentPersona persona = DevelopmentPersonaCatalog.All.Single(candidate => candidate.Key == key);
    string token = factory.Create(persona);
    ClaimsPrincipal principal = ValidateToken(token, timeProvider);

    Assert.AreEqual(
      websiteIdentifier,
      principal.FindFirst("userIdentifier")?.Value);
    Assert.AreEqual("user", principal.FindFirst("role")?.Value);
    Assert.AreEqual($"{key}@arolariu.ro", principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value);
  }

  /// <summary>
  /// Verifies local tokens expire eight hours after issuance.
  /// </summary>
  [TestMethod]
  public void Create_Alice_ExpiresAfterEightHours()
  {
    var factory = new DevelopmentTokenFactory(
      Options,
      new FixedTimeProvider(Anchor));

    string token = factory.Create(DevelopmentPersonaCatalog.Alice);
    JwtSecurityToken parsed = new JwtSecurityTokenHandler()
      .ReadJwtToken(token);

    Assert.AreEqual(Anchor.AddHours(8).UtcDateTime, parsed.ValidTo);
    Assert.AreEqual(Anchor.UtcDateTime, parsed.ValidFrom);
    Assert.AreEqual(Options.Issuer, parsed.Issuer);
    CollectionAssert.AreEqual(new[] { Options.Audience }, parsed.Audiences.ToArray());
    Assert.AreEqual("HS256", parsed.Header.Alg);
  }

  /// <summary>
  /// Verifies weak signing secrets are rejected.
  /// </summary>
  [TestMethod]
  public void Constructor_ShortSecret_ThrowsArgumentException()
  {
    Assert.ThrowsExactly<ArgumentException>(() =>
      new DevelopmentTokenFactory(
        Options with { Secret = "short" },
        TimeProvider.System));
  }

  /// <summary>
  /// Verifies the factory can be constructed through its runtime DI registration.
  /// </summary>
  [TestMethod]
  public void DependencyInjection_ResolveFactory_ConstructsFactory()
  {
    var services = new ServiceCollection();
    services.AddSingleton(Options);
    services.AddSingleton(TimeProvider.System);
    services.AddSingleton<DevelopmentTokenFactory>();

    using ServiceProvider provider = services.BuildServiceProvider(
      new ServiceProviderOptions
      {
        ValidateOnBuild = true,
      });

    DevelopmentTokenFactory factory =
      provider.GetRequiredService<DevelopmentTokenFactory>();

    Assert.IsNotNull(factory);
  }

  private static ClaimsPrincipal ValidateToken(
    string token,
    TimeProvider timeProvider)
  {
    var handler = new JwtSecurityTokenHandler
    {
      MapInboundClaims = false,
    };
    return handler.ValidateToken(
      token,
      new TokenValidationParameters
      {
        ValidateIssuer = true,
        ValidIssuer = Options.Issuer,
        ValidateAudience = true,
        ValidAudience = Options.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        LifetimeValidator = (notBefore, expires, _, _) =>
        {
          DateTime now = timeProvider.GetUtcNow().UtcDateTime;
          return notBefore.HasValue
            && expires.HasValue
            && notBefore.Value <= now
            && expires.Value >= now;
        },
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
          Encoding.UTF8.GetBytes(Options.Secret)),
      },
      out _);
  }

  private sealed class FixedTimeProvider(
    DateTimeOffset instant) : TimeProvider
  {
    public override DateTimeOffset GetUtcNow() => instant;
  }
}
