namespace AppHost.Infrastructure.Sql;

using Microsoft.Data.SqlClient;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;

/// <summary>Owns the local SQL connection contract.</summary>
internal static class SqlResources
{
  internal static IResourceBuilder<SqlServerDatabaseResource> AddLocalSql(
    this IDistributedApplicationBuilder builder, string sqlPassword)
  {
    string readinessConnection = CreateConnectionString(sqlPassword, "master", 5);
    var password = builder.AddParameter("sql-password", secret: true);
    var sql = builder.AddSqlServer("mssql", password: password, port: Constants.SqlPort)
      .WithDataVolume(Constants.SqlDataVolume)
      // TDS uses direct TCP rather than DCP's application proxy.
      .WithEndpoint("tcp", endpoint => endpoint.IsProxied = false)
      .WithIconName("Database");
    var database = sql.AddDatabase(Constants.SqlDatabaseName)
      .WithCreationScript($"""
        IF DB_ID('{Constants.SqlDatabaseName}') IS NULL
            CREATE DATABASE [{Constants.SqlDatabaseName}];
        """);
    builder.Services.AddHealthChecks().AddCheck("sql-ready",
      new SqlReadinessHealthCheck(() => new SqlConnection(readinessConnection)));
    sql.WithHealthCheck("sql-ready");
    return database;
  }

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
