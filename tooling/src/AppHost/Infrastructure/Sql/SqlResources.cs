namespace AppHost.Infrastructure.Sql;

using AppHost.LocalDevelopment;
using Microsoft.Data.SqlClient;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using global::LocalDevelopment.Data;

/// <summary>Owns the local SQL connection contract.</summary>
internal static class SqlResources
{
  internal static string DatabaseCreationScript => LocalDataContract.SqlDatabaseCreationScript;

  internal static IResourceBuilder<SqlServerDatabaseResource> AddLocalSql(
    this IDistributedApplicationBuilder builder, string sqlPassword, WorktreeLaunchScope? scope = null)
  {
    int port = scope?.Port("sql") ?? Constants.SqlPort;
    string readinessConnection = CreateConnectionString(sqlPassword, "master", 5, port);
    var password = scope is null
      ? builder.AddParameter("sql-password", secret: true)
      : builder.AddParameter("sql-password", sqlPassword, secret: true);
    var sql = builder.AddSqlServer("mssql", password: password, port: port)
      .WithImageSHA256(Constants.SqlServerImageSha256)
      .WithDataVolume(scope?.Volumes["sql"] ?? Constants.SqlDataVolumeV16_0_4305_5)
      // DCP forwards TDS to the allocated container port while keeping the public port fixed.
      .WithEndpoint("tcp", endpoint => endpoint.IsProxied = true)
      .WithIconName("Database");
    scope?.LabelContainer(sql);
    var database = sql.AddDatabase(LocalDataContract.SqlDatabaseName)
      .WithCreationScript(DatabaseCreationScript);
    builder.Services.AddHealthChecks().AddCheck("sql-ready",
      new SqlReadinessHealthCheck(() => new SqlConnection(readinessConnection)));
    sql.WithHealthCheck("sql-ready");
    return database;
  }

  internal static string CreateConnectionString(
    string password, string databaseName, int? connectionTimeout = null, int port = Constants.SqlPort)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(password);
    ArgumentException.ThrowIfNullOrWhiteSpace(databaseName);
    var connection = new SqlConnectionStringBuilder
    {
      DataSource = FormattableString.Invariant($"127.0.0.1,{port}"),
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
