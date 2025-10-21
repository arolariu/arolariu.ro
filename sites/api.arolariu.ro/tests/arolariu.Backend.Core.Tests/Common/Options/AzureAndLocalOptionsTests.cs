namespace arolariu.Backend.Core.Tests.Common.Options;

using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Options;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="AzureOptions"/> and <see cref="LocalOptions"/> verifying defaults and property persistence.
/// Naming follows MethodName_Condition_ExpectedResult pattern.
/// </summary>
[SuppressMessage("Design", "CA1515", Justification = "Public visibility required for MSTest discovery.")]
[SuppressMessage("Naming", "CA1707", Justification = "Underscore naming convention enforced across test suite.")]
[TestClass]
public sealed class AzureAndLocalOptionsTests
{
  /// <summary>Ensures all defaults on AzureOptions are empty strings per design.</summary>
  [TestMethod]
  public void AzureOptions_Defaults_AreEmptyStrings()
  {
    var o = new AzureOptions();
    Assert.AreEqual(string.Empty, o.TenantId);
    Assert.AreEqual(string.Empty, o.SecretsEndpoint);
    Assert.AreEqual(string.Empty, o.ConfigurationEndpoint);
    Assert.AreEqual(string.Empty, o.StorageAccountName);
    Assert.AreEqual(string.Empty, o.StorageAccountEndpoint);
    Assert.AreEqual(string.Empty, o.SqlConnectionString);
    Assert.AreEqual(string.Empty, o.NoSqlConnectionString);
    Assert.AreEqual(string.Empty, o.OpenAIEndpoint);
    Assert.AreEqual(string.Empty, o.OpenAIKey);
    Assert.AreEqual(string.Empty, o.ApplicationInsightsEndpoint);
    Assert.AreEqual(string.Empty, o.CognitiveServicesEndpoint);
    Assert.AreEqual(string.Empty, o.CognitiveServicesKey);
    Assert.AreEqual(string.Empty, o.JwtIssuer);
    Assert.AreEqual(string.Empty, o.JwtAudience);
    Assert.AreEqual(string.Empty, o.JwtSecret);
    Assert.AreEqual(string.Empty, o.ApplicationName);
    Assert.AreEqual(string.Empty, o.ApplicationVersion);
    Assert.AreEqual(string.Empty, o.ApplicationDescription);
    Assert.AreEqual(string.Empty, o.ApplicationAuthor);
    Assert.AreEqual(string.Empty, o.TermsAndConditions);
  }

  /// <summary>Validates property assignments on LocalOptions persist values.</summary>
  [TestMethod]
  public void LocalOptions_PropertyAssignment_PersistsValues()
  {
    var o = new LocalOptions
    {
      TenantId = "tenant",
      SecretsEndpoint = "https://kv/",
      ConfigurationEndpoint = "https://cfg/",
      StorageAccountName = "stor",
      StorageAccountEndpoint = "https://stor.blob.core.windows.net/",
      SqlConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=Test;",
      NoSqlConnectionString = "AccountEndpoint=https://cosmos/;AccountKey=key;",
      OpenAIEndpoint = "https://openai/",
      OpenAIKey = "k",
      ApplicationInsightsEndpoint = "InstrumentationKey=ikey",
      CognitiveServicesEndpoint = "https://cog/",
      CognitiveServicesKey = "ckey",
      JwtIssuer = "issuer",
      JwtAudience = "aud",
      JwtSecret = "super-secret-value-0123456789",
      ApplicationName = "App",
      ApplicationVersion = "1.2.3",
      ApplicationDescription = "Desc",
      ApplicationAuthor = "Author",
      TermsAndConditions = "Terms"
    };

    Assert.AreEqual("tenant", o.TenantId);
    Assert.AreEqual("issuer", o.JwtIssuer);
    Assert.AreEqual("aud", o.JwtAudience);
    Assert.AreEqual("super-secret-value-0123456789", o.JwtSecret);
    Assert.AreEqual("App", o.ApplicationName);
  }
}
