namespace LocalDevelopment.Tests.Identity.Configuration;

using System.Text.Json;
using global::LocalDevelopment.Identity.Configuration;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies local identity configuration retains its startup contract.</summary>
[TestClass]
public sealed class LocalIdentityOptionsTests
{
  /// <summary>Verifies missing signing fields cannot produce successful startup options.</summary>
  [TestMethod]
  [DataRow("Auth:JWT:Issuer")]
  [DataRow("Auth:JWT:Audience")]
  [DataRow("Auth:JWT:Secret")]
  public void Load_MissingSigningField_ThrowsInvalidOperationException(string key)
  {
    string path = Path.GetTempFileName();
    var values = new Dictionary<string, string>
    {
      ["Auth:JWT:Issuer"] = "issuer",
      ["Auth:JWT:Audience"] = "audience",
      ["Auth:JWT:Secret"] = "secret",
    };
    values.Remove(key);
    File.WriteAllText(path, JsonSerializer.Serialize(values));
    try
    {
      InvalidOperationException exception = Assert.ThrowsExactly<InvalidOperationException>(() =>
        LocalIdentityOptions.Load(path, "http://localhost:5000"));
      StringAssert.Contains(exception.Message, key);
    }
    finally { File.Delete(path); }
  }

  /// <summary>Verifies each missing, blank, or wrongly typed signing field is rejected.</summary>
  [TestMethod]
  [DataRow("Auth:JWT:Issuer", "")]
  [DataRow("Auth:JWT:Audience", "")]
  [DataRow("Auth:JWT:Secret", "")]
  [DataRow("Auth:JWT:Secret", null)]
  public void Load_InvalidSigningField_ThrowsInvalidOperationException(string key, string? value)
  {
    string path = Path.GetTempFileName();
    var values = new Dictionary<string, object?>
    {
      ["Auth:JWT:Issuer"] = "issuer",
      ["Auth:JWT:Audience"] = "audience",
      ["Auth:JWT:Secret"] = "local-test-secret-at-least-thirty-two-bytes",
    };
    values[key] = value is null ? 123 : value;
    File.WriteAllText(path, JsonSerializer.Serialize(values));
    try
    {
      InvalidOperationException exception = Assert.ThrowsExactly<InvalidOperationException>(() =>
        LocalIdentityOptions.Load(path, "http://localhost:5000"));
      StringAssert.Contains(exception.Message, key);
    }
    finally { File.Delete(path); }
  }

  /// <summary>Verifies the configuration values and Swagger origin survive loading.</summary>
  [TestMethod]
  public void Load_ValidSigningFields_PreservesValues()
  {
    string path = Path.GetTempFileName();
    File.WriteAllText(path, """{"Auth:JWT:Issuer":"issuer","Auth:JWT:Audience":"audience","Auth:JWT:Secret":"secret"}""");
    try
    {
      LocalIdentityOptions options = LocalIdentityOptions.Load(path, "http://localhost:5000");
      Assert.AreEqual("issuer", options.Issuer);
      Assert.AreEqual("audience", options.Audience);
      Assert.AreEqual("secret", options.Secret);
      Assert.AreEqual("http://localhost:5000", options.SwaggerOrigin);
    }
    finally { File.Delete(path); }
  }
}
