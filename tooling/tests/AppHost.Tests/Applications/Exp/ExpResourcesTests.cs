namespace AppHost.Tests.Applications.Exp;

using global::AppHost.Applications.Exp;
using Microsoft.Data.SqlClient;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the host's endpoint overlay retains its local service contract.</summary>
[TestClass]
public sealed class ExpResourcesTests
{
  /// <summary>Verifies all four endpoints and the SQL application database.</summary>
  [TestMethod]
  public void CreateEndpointOverrides_ValidPassword_ReturnsLocalEndpoints()
  {
    IReadOnlyDictionary<string, string> values = ExpResources.CreateEndpointOverrides("local;password");
    Assert.HasCount(4, values);
    Assert.AreEqual("http://localhost:10000/devstoreaccount1", values["Endpoints:Storage:Blob"]);
    Assert.AreEqual("http://localhost:5000", values["Endpoints:Service:Api"]);
    StringAssert.StartsWith(values["Endpoints:Database:NoSQL"], "AccountEndpoint=https://localhost:8081/;");
    var sql = new SqlConnectionStringBuilder(values["Endpoints:Database:SQL"]);
    Assert.AreEqual("arolariu-sql", sql.InitialCatalog);
    Assert.AreEqual("local;password", sql.Password);
  }

  /// <summary>Verifies invalid SQL inputs do not produce a successful overlay.</summary>
  [TestMethod]
  public void CreateEndpointOverrides_EmptyPassword_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => ExpResources.CreateEndpointOverrides(""));
}
