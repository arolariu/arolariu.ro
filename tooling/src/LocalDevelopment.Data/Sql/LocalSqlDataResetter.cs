namespace LocalDevelopment.Data.Sql;

using System.Data.Common;
using arolariu.Backend.Core.Auth.Brokers;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

/// <summary>Clears user databases and restores the application-owned Identity schema without changing server configuration.</summary>
/// <param name="createMasterConnection">Creates an owned master connection to the already-authorized local SQL target.</param>
public sealed class LocalSqlDataResetter(Func<DbConnection> createMasterConnection)
{
  /// <summary>Deletes user databases while preserving all SQL system databases and server configuration.</summary>
  /// <param name="cancellationToken">Cancels catalog enumeration or deletion between databases.</param>
  /// <returns>A task that completes after user databases have been removed.</returns>
  public async Task ClearAsync(CancellationToken cancellationToken)
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

  /// <summary>Restores the application database and the existing Identity schema.</summary>
  /// <param name="cancellationToken">Cancels database and schema creation.</param>
  /// <returns>A task that completes once the application schema exists.</returns>
  public async Task EnsureApplicationDatabaseAsync(CancellationToken cancellationToken)
  {
    await using DbConnection connection = createMasterConnection();
    // Capture credentials before SqlClient redacts the opened connection string.
    var settings = new SqlConnectionStringBuilder(connection.ConnectionString)
    {
      InitialCatalog = LocalDataContract.SqlDatabaseName,
    };
    await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
    RequireMaster(connection);
    await using DbCommand create = connection.CreateCommand();
    create.CommandText = LocalDataContract.SqlDatabaseCreationScript;
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
