namespace arolariu.Backend.Core.Tests.CoreAuth.Data;

using System;

using arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;

using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="AuthDbContext"/> construction and provider configuration paths.
/// Method names follow the mandated MethodName_Condition_ExpectedResult pattern.
/// </summary>
[TestClass]
public sealed class AuthDbContextTests
{
  /// <summary>Verifies parameterless constructor creates a usable context instance.</summary>
  [TestMethod]
  public void ParameterlessConstructor_CreatesInstance()
  {
    using var ctx = new AuthDbContext(); // dispose to satisfy CA2000
    Assert.IsNotNull(ctx);
  }

  /// <summary>Ensures options constructor uses the in-memory provider when configured.</summary>
  [TestMethod]
  public void OptionsConstructor_UsesInMemoryProvider()
  {
    var options = new DbContextOptionsBuilder<AuthDbContext>()
    .UseInMemoryDatabase($"auth-{Guid.NewGuid()}")
    .Options;

    using var ctx = new AuthDbContext(options);

    Assert.IsNotNull(ctx.Set<AuthenticatedUser>());
    Assert.IsNotNull(ctx.Set<AuthenticatedUserRole>());
    Assert.IsTrue(ctx.Database.ProviderName != null && ctx.Database.ProviderName.Contains("InMemory", StringComparison.OrdinalIgnoreCase));
  }
}
