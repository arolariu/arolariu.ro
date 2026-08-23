namespace AppHost.Tests;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

using LocalDevelopment.Identity;

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

/// <summary>
/// Verifies the local identity service rejects unsafe binding configuration.
/// </summary>
[TestClass]
public sealed class LocalIdentityBindingTests
{
  /// <summary>
  /// Verifies explicit loopback bindings are accepted.
  /// </summary>
  [TestMethod]
  public void RequireLoopbackBinding_LoopbackUrls_ReturnsNormally()
  {
    LocalDevelopment.Identity.Program.RequireLoopbackBinding(
      "http://localhost:5011;https://127.0.0.1:5012");
  }

  /// <summary>
  /// Verifies the token service cannot start without an explicit binding.
  /// </summary>
  [TestMethod]
  public void RequireLoopbackBinding_MissingUrls_ThrowsInvalidOperationException()
  {
    Assert.ThrowsExactly<InvalidOperationException>(
      () => LocalDevelopment.Identity.Program.RequireLoopbackBinding(null));
  }

  /// <summary>
  /// Verifies any remote binding prevents token service startup.
  /// </summary>
  [TestMethod]
  [DataRow("http://0.0.0.0:5011")]
  [DataRow("http://localhost:5011;http://192.0.2.1:5011")]
  public void RequireLoopbackBinding_RemoteUrl_ThrowsInvalidOperationException(
    string urls)
  {
    Assert.ThrowsExactly<InvalidOperationException>(
      () => LocalDevelopment.Identity.Program.RequireLoopbackBinding(urls));
  }
}
