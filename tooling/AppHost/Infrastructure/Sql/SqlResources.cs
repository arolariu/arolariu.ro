namespace AppHost.Infrastructure.Sql;

using Microsoft.Data.SqlClient;

/// <summary>Owns the local SQL connection contract.</summary>
internal static class SqlResources
{
  internal static string CreateConnectionString(
    string password, string databaseName, int? connectionTimeout = null)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(password);
    ArgumentException.ThrowIfNullOrWhiteSpace(databaseName);
    var connection = new SqlConnectionStringBuilder
    {
      DataSource = $"127.0.0.1,{Constants.SqlPort}",
      InitialCatalog = databaseName,
      UserID = "sa",
      Password = password,
      Encrypt = SqlConnectionEncryptOption.Optional,
      TrustServerCertificate = true,
    };
    if (connectionTimeout is int timeout) { connection.ConnectTimeout = timeout; }
    return connection.ConnectionString;
  }
}
