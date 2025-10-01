namespace arolariu.Backend.Core.Tests.CoreAuth.Data;

using System;
using arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class AuthDbContextTests
{
  [TestMethod]
  public void ParameterlessConstructor_CreatesInstance()
  {
    var ctx = new AuthDbContext();
    Assert.IsNotNull(ctx);
  }

  [TestMethod]
  public void OptionsConstructor_UsesInMemoryProvider()
  {
    var options = new DbContextOptionsBuilder<AuthDbContext>()
      .UseInMemoryDatabase($"auth-{Guid.NewGuid()}")
      .Options;

    using var ctx = new AuthDbContext(options);

    Assert.IsNotNull(ctx.Set<AuthenticatedUser>());
    Assert.IsNotNull(ctx.Set<AuthenticatedUserRole>());
    // Provider name should contain InMemory
    Assert.IsTrue(ctx.Database.ProviderName != null && ctx.Database.ProviderName.Contains("InMemory", StringComparison.OrdinalIgnoreCase));
  }
}
