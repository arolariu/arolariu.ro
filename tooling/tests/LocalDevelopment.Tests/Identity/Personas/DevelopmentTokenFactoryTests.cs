namespace LocalDevelopment.Tests.Identity.Personas;

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
  public void Create_Alice_ReturnsValidSignedTokenWithExpectedClaims()
  {
    var timeProvider = new FixedTimeProvider(Anchor);
    var factory = new DevelopmentTokenFactory(
      Options,
      timeProvider);

    string token = factory.Create(DevelopmentPersonaCatalog.Alice);
    ClaimsPrincipal principal = ValidateToken(token, timeProvider);

    Assert.AreEqual(
      DevelopmentPersonaCatalog.Alice.UserIdentifier.ToString(),
      principal.FindFirst("userIdentifier")?.Value);
    Assert.AreEqual("user", principal.FindFirst("role")?.Value);
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
