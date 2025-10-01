namespace arolariu.Backend.Core.Tests.CoreAuth.Services;

using System;
using System.Linq;
using System.Threading.Tasks;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;
using arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Core.Tests.Shared.TestDoubles;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class AddAuthServicesTests
{
  private static WebApplicationBuilder CreateBuilderWithOptions(ApplicationOptions opts)
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(opts));
    return builder;
  }

  private static ApplicationOptions CreateOptions() => new LocalOptions
  {
    SqlConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=Test;",
    JwtSecret = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEF", // 40+ chars
    JwtIssuer = "issuer",
    JwtAudience = "aud"
  };

  [TestMethod]
  public void AddAuthServices_NullBuilder_Throws()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => WebApplicationBuilderExtensions.AddAuthServices(null!));
  }

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

    // Authorization services
    Assert.IsNotNull(provider.GetService<IAuthorizationService>());
  }

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

  [TestMethod]
  public void AddAuthServices_SetsJwtBearerAsDefaultScheme()
  {
    var builder = CreateBuilderWithOptions(CreateOptions());
    builder.AddAuthServices();
    using var provider = builder.Services.BuildServiceProvider();
    var schemeProvider = provider.GetRequiredService<IAuthenticationSchemeProvider>();
    var defaultScheme = Task.Run(async () => (await schemeProvider.GetDefaultAuthenticateSchemeAsync())?.Name).Result;

    Assert.AreEqual(JwtBearerDefaults.AuthenticationScheme, defaultScheme);
  }

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
    Assert.IsTrue(cookieOpts.ExpireTimeSpan.TotalMinutes <= 30.1 && cookieOpts.ExpireTimeSpan.TotalMinutes >= 29.9);
  }
}
