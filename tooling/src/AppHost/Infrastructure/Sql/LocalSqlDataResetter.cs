namespace AppHost.Infrastructure.Sql;

using System.Data.Common;
using arolariu.Backend.Core.Auth.Brokers;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

/// <summary>Clears user databases and restores the application-owned Identity schema without changing server configuration.</summary>
internal sealed class LocalSqlDataResetter(Func<DbConnection> createMasterConnection)
{
  internal async Task ClearAsync(CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    await using DbConnection connection = createMasterConnection();
    await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
    RequireMaster(connection);
    var names = new List<string>();
    await using (DbCommand catalog = connection.CreateCommand())
    {
      catalog.CommandText = "SELECT [name] FROM sys.databases WHERE database_id > 4;";
      await using DbDataReader reader = await catalog.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
      while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
      {
        string name = reader.GetString(0);
        if (!IsSystemDatabase(name)) { names.Add(name); }
      }
    }
    using var identifiers = new SqlCommandBuilder();
    foreach (string name in names)
    {
      cancellationToken.ThrowIfCancellationRequested();
      string quoted = identifiers.QuoteIdentifier(name);
      await using DbCommand drop = connection.CreateCommand();
      drop.CommandText = $"ALTER DATABASE {quoted} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE {quoted};";
      await drop.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
    }
    cancellationToken.ThrowIfCancellationRequested();
  }

  internal async Task EnsureApplicationDatabaseAsync(CancellationToken cancellationToken)
  {
    await using DbConnection connection = createMasterConnection();
    // Capture credentials before SqlClient redacts the opened connection string.
    var settings = new SqlConnectionStringBuilder(connection.ConnectionString)
    {
      InitialCatalog = Constants.SqlDatabaseName,
    };
    await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
    RequireMaster(connection);
    await using DbCommand create = connection.CreateCommand();
    create.CommandText = SqlResources.DatabaseCreationScript;
    await create.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
    var options = new DbContextOptionsBuilder<AuthDbContext>()
      .UseSqlServer(settings.ConnectionString).Options;
    await using var identity = new AuthDbContext(options);
    await identity.Database.EnsureCreatedAsync(cancellationToken).ConfigureAwait(false);
  }

  private static bool IsSystemDatabase(string name) =>
    string.Equals(name, "master", StringComparison.OrdinalIgnoreCase)
    || string.Equals(name, "model", StringComparison.OrdinalIgnoreCase)
    || string.Equals(name, "msdb", StringComparison.OrdinalIgnoreCase)
    || string.Equals(name, "tempdb", StringComparison.OrdinalIgnoreCase);

  private static void RequireMaster(DbConnection connection)
  {
    if (!string.Equals(connection.Database, "master", StringComparison.OrdinalIgnoreCase))
    {
      throw new InvalidOperationException("Local SQL reset requires a connection to master.");
    }
  }
}
