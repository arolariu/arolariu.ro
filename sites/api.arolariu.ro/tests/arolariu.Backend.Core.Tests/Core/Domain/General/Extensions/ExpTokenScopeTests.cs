namespace arolariu.Backend.Core.Tests.Core.Domain.General.Extensions;

using System;

using arolariu.Backend.Core.Domain.General.Extensions;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies required deployment-configured experiments audiences.</summary>
[TestClass]
public sealed class ExpTokenScopeTests
{
  /// <summary>Configured canonical IDs select their own application audience.</summary>
  [TestMethod]
  public void ResolveExpTokenScope_ConfiguredId_ReturnsConfiguredScope()
  {
    var scope = WebApplicationBuilderExtensions.ResolveExpTokenScope("11111111-2222-4333-8444-555555555555");

    Assert.AreEqual("api://11111111-2222-4333-8444-555555555555/.default", scope);
  }

  /// <summary>Whitespace and casing are normalized without changing the configured identifier.</summary>
  [TestMethod]
  public void ResolveExpTokenScope_PaddedUppercaseId_ReturnsNormalizedScope()
  {
    var scope = WebApplicationBuilderExtensions.ResolveExpTokenScope("  AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE  ");

    Assert.AreEqual("api://aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/.default", scope);
  }

  /// <summary>Absent configuration must not select an unrelated legacy registration.</summary>
  /// <param name="value">The absent or blank environment value.</param>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  public void ResolveExpTokenScope_MissingId_ThrowsArgumentException(string? value)
  {
    Assert.ThrowsExactly<ArgumentException>(() => WebApplicationBuilderExtensions.ResolveExpTokenScope(value));
  }

  /// <summary>Malformed non-empty values fail without including their contents.</summary>
  [TestMethod]
  public void ResolveExpTokenScope_MalformedId_ThrowsArgumentException()
  {
    const string value = "private-malformed-application-value";

    var exception = Assert.ThrowsExactly<ArgumentException>(
      () => WebApplicationBuilderExtensions.ResolveExpTokenScope(value));

    Assert.IsFalse(exception.Message.Contains(value, StringComparison.Ordinal));
  }
}
