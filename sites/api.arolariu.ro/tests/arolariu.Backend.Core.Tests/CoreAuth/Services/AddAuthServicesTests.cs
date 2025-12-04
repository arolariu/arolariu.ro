namespace arolariu.Backend.Core.Tests.CoreAuth.Services;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;
using arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Core.Tests.Shared.TestDoubles;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests covering authentication service registration and configuration logic in <see cref="WebApplicationBuilderExtensions.AddAuthServices"/>.
/// Naming follows the <c>MethodName_Condition_ExpectedResult</c> pattern per repository guidelines.
/// </summary>
[TestClass]
public sealed class AddAuthServicesTests
{
  /// <summary>Create a <see cref="WebApplicationBuilder"/> with injected fake options manager.</summary>
  private static WebApplicationBuilder CreateBuilderWithOptions(LocalOptions opts)
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(opts));
    return builder;
  }

  /// <summary>Builds a deterministic set of local options for test scenarios.</summary>
  private static LocalOptions CreateOptions() => new()
  {
    SqlConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=Test;",
    JwtSecret = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEF", //40+ chars
    JwtIssuer = "issuer",
    JwtAudience = "aud"
  };

  /// <summary>Verifies that passing a null builder throws <see cref="ArgumentNullException"/>.</summary>
  [TestMethod]
  public void AddAuthServices_NullBuilder_Throws() => Assert.ThrowsExactly<ArgumentNullException>(() => WebApplicationBuilderExtensions.AddAuthServices(null!));

  /// <summary>Ensures identity core services and authorization services are registered.</summary>
  [TestMethod]
  public void AddAuthServices_RegistersCoreIdentityServices()
  {
    var builder = CreateBuilderWithOptions(CreateOptions());
    builder.AddAuthServices();
    using var provider = builder.Services.BuildServiceProvider();

    // DbContext
    var ctx = provider.GetService<AuthDbContext>();
    Assert.IsNotNull(ctx);

    // Identity managers
    Assert.IsNotNull(provider.GetService<UserManager<AuthenticatedUser>>());
    Assert.IsNotNull(provider.GetService<SignInManager<AuthenticatedUser>>());
    Assert.IsNotNull(provider.GetService<RoleManager<AuthenticatedUserRole>>());

    // Authorization services
    Assert.IsNotNull(provider.GetService<IAuthorizationService>());
  }

  /// <summary>Validates password, user, and general identity option configuration.</summary>
  [TestMethod]
  public void AddAuthServices_ConfiguresIdentityOptions()
  {
    var builder = CreateBuilderWithOptions(CreateOptions());
    builder.AddAuthServices();
    using var provider = builder.Services.BuildServiceProvider();
    var identityOpts = provider.GetRequiredService<IOptions<IdentityOptions>>().Value;

    Assert.IsTrue(identityOpts.Password.RequireNonAlphanumeric);
    Assert.IsTrue(identityOpts.Password.RequireDigit);
    Assert.IsTrue(identityOpts.Password.RequireLowercase);
    Assert.IsTrue(identityOpts.Password.RequireUppercase);
    Assert.AreEqual(16, identityOpts.Password.RequiredLength);

    Assert.IsTrue(identityOpts.User.RequireUniqueEmail);
  }

  /// <summary>Ensures JWT bearer is set as the default authentication scheme.</summary>
  [TestMethod]
  public async Task AddAuthServices_SetsJwtBearerAsDefaultScheme()
  {
    var builder = CreateBuilderWithOptions(CreateOptions());
    builder.AddAuthServices();
    using var provider = builder.Services.BuildServiceProvider();
    var schemeProvider = provider.GetRequiredService<IAuthenticationSchemeProvider>();
    var defaultScheme = (await schemeProvider.GetDefaultAuthenticateSchemeAsync().ConfigureAwait(false))?.Name;

    Assert.AreEqual(JwtBearerDefaults.AuthenticationScheme, defaultScheme);
  }

  /// <summary>Verifies JWT validation parameters configured from provided options.</summary>
  [TestMethod]
  public void AddAuthServices_ConfiguresJwtBearerValidationParameters()
  {
    var builder = CreateBuilderWithOptions(CreateOptions());
    builder.AddAuthServices();
    using var provider = builder.Services.BuildServiceProvider();
    var jwtOptions = provider
    .GetRequiredService<IOptionsMonitor<JwtBearerOptions>>()
    .Get(JwtBearerDefaults.AuthenticationScheme);

    Assert.AreEqual("issuer", jwtOptions.TokenValidationParameters.ValidIssuer);
    Assert.AreEqual("aud", jwtOptions.TokenValidationParameters.ValidAudience);
    Assert.IsNotNull(jwtOptions.TokenValidationParameters.IssuerSigningKey);
    Assert.IsTrue(jwtOptions.TokenValidationParameters.ValidateIssuerSigningKey);
    Assert.IsTrue(jwtOptions.TokenValidationParameters.ValidateLifetime);
  }

  /// <summary>Checks application cookie configuration (HttpOnly, sliding expiration, custom name).</summary>
  [TestMethod]
  public void AddAuthServices_ConfiguresApplicationCookie()
  {
    var builder = CreateBuilderWithOptions(CreateOptions());
    builder.AddAuthServices();
    using var provider = builder.Services.BuildServiceProvider();

    // Identity uses IdentityConstants.ApplicationScheme for app cookie
    var cookieOpts = provider
    .GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
    .Get(IdentityConstants.ApplicationScheme);

    Assert.IsTrue(cookieOpts.Cookie.HttpOnly);
    Assert.IsTrue(cookieOpts.SlidingExpiration);
    Assert.AreEqual("auth-arolariu-ro", cookieOpts.Cookie.Name);
    Assert.IsTrue(cookieOpts.ExpireTimeSpan.TotalMinutes is <= 30.1 and >= 29.9);
  }
}
