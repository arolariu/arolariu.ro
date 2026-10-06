namespace LocalDevelopment.Tests.AppHost.Infrastructure.Sql;

using global::AppHost.Infrastructure.Sql;
using Microsoft.Data.SqlClient;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies local SQL connection settings and escaping.</summary>
[TestClass]
public sealed class SqlResourcesTests
{
  /// <summary>Verifies punctuation in a password cannot alter connection settings.</summary>
  [TestMethod]
  public void CreateConnectionString_SpecialPassword_RoundTrips()
  {
    const string password = "local;pass=\"quoted\"";
    var parsed = new SqlConnectionStringBuilder(
      SqlResources.CreateConnectionString(password, "master", 5));

    Assert.AreEqual(password, parsed.Password);
    Assert.AreEqual("127.0.0.1,8082", parsed.DataSource);
    Assert.AreEqual("sa", parsed.UserID);
    Assert.AreEqual("master", parsed.InitialCatalog);
    Assert.AreEqual(5, parsed.ConnectTimeout);
    Assert.AreEqual(SqlConnectionEncryptOption.Optional, parsed.Encrypt);
    Assert.IsTrue(parsed.TrustServerCertificate);
  }

  /// <summary>Verifies the application connection keeps the client timeout default.</summary>
  [TestMethod]
  public void CreateConnectionString_ApplicationDatabase_KeepsDefaultTimeout()
  {
    var parsed = new SqlConnectionStringBuilder(
      SqlResources.CreateConnectionString("local-password", "arolariu-sql"));
    Assert.AreEqual("arolariu-sql", parsed.InitialCatalog);
    Assert.AreEqual(15, parsed.ConnectTimeout);
  }

  /// <summary>Verifies an absent password fails before generating configuration.</summary>
  [TestMethod]
  public void CreateConnectionString_EmptyPassword_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => SqlResources.CreateConnectionString("", "master"));
}
