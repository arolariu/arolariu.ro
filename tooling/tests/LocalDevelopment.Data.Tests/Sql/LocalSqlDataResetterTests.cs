namespace LocalDevelopment.Data.Tests.Sql;

using System.Data;
using System.Data.Common;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using global::LocalDevelopment.Data.Sql;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies database-wide SQL clearing at the actual ADO command boundary.</summary>
[TestClass]
public sealed class LocalSqlDataResetterTests
{
  /// <summary>A non-master connection cannot execute catalog or destructive SQL commands.</summary>
  [TestMethod]
  public async Task ClearAsync_NonMasterConnection_DoesNotIssueCommands()
  {
    using DataTable catalog = CreateCatalog("custom");
    var commands = new List<string>();
    var resetter = new LocalSqlDataResetter(() =>
      new RecordingConnection(catalog, commands, database: "arolariu-sql"));

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(() => resetter.ClearAsync(CancellationToken.None));

    Assert.HasCount(0, commands);
  }

  /// <summary>Catalog filtering alone must never authorize deletion of a system database.</summary>
  [TestMethod]
  public async Task ClearAsync_SystemDatabases_AreNeverDropped()
  {
    using DataTable catalog = CreateCatalog("master", "MODEL", "msdb", "tempdb", "arolariu-sql", "custom");
    var commands = new List<string>();

    await new LocalSqlDataResetter(() => new RecordingConnection(catalog, commands)).ClearAsync(CancellationToken.None);

    string[] drops = commands.Where(command => command.Contains("DROP DATABASE", StringComparison.OrdinalIgnoreCase)).ToArray();
    Assert.HasCount(2, drops);
    Assert.IsTrue(drops.Any(command => command.Contains("DROP DATABASE [arolariu-sql]", StringComparison.Ordinal)));
    Assert.IsTrue(drops.Any(command => command.Contains("DROP DATABASE [custom]", StringComparison.Ordinal)));
  }

  /// <summary>Database names from the catalog remain identifiers rather than executable text.</summary>
  [TestMethod]
  public async Task ClearAsync_QuotedDatabaseIdentifier_RemainsOneIdentifier()
  {
    using DataTable catalog = CreateCatalog("sales];--");
    var commands = new List<string>();

    await new LocalSqlDataResetter(() => new RecordingConnection(catalog, commands)).ClearAsync(CancellationToken.None);

    Assert.IsTrue(commands.Any(command => command.Contains("DROP DATABASE [sales]];--]", StringComparison.Ordinal)));
  }

  /// <summary>Cancellation after one drop cannot clear a later database.</summary>
  [TestMethod]
  public async Task ClearAsync_CancelledAfterFirstDrop_DoesNotDropAnotherDatabase()
  {
    using DataTable catalog = CreateCatalog("first", "second");
    using var source = new CancellationTokenSource();
    var commands = new List<string>();
    var resetter = new LocalSqlDataResetter(() => new RecordingConnection(catalog, commands, source.Cancel));

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() => resetter.ClearAsync(source.Token));

    Assert.AreEqual(1, commands.Count(command => command.Contains("DROP DATABASE", StringComparison.OrdinalIgnoreCase)));
  }

  private static DataTable CreateCatalog(params string[] names)
  {
    var table = new DataTable { Locale = CultureInfo.InvariantCulture };
    table.Columns.Add("name", typeof(string));
    foreach (string name in names) { table.Rows.Add(name); }
    return table;
  }

  private sealed class RecordingConnection(
    DataTable catalog, List<string> commands, Action? afterDrop = null, string database = "master") : DbConnection
  {
    [AllowNull]
    public override string ConnectionString { get; set; } = "";
    public override string Database => database;
    public override string DataSource => "fixture";
    public override string ServerVersion => "1";
    public override ConnectionState State => ConnectionState.Open;
    public override void Open() => throw new NotSupportedException();
    public override Task OpenAsync(CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return Task.CompletedTask;
    }
    public override void Close() { }
    public override void ChangeDatabase(string databaseName) => throw new NotSupportedException();
    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => throw new NotSupportedException();
    protected override DbCommand CreateDbCommand() => new RecordingCommand(catalog, commands, afterDrop);
  }

  private sealed class RecordingCommand(DataTable catalog, List<string> commands, Action? afterDrop) : DbCommand
  {
    [AllowNull]
    public override string CommandText { get; set; } = "";
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; }
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; }
    protected override DbTransaction? DbTransaction { get; set; }
    protected override DbParameterCollection DbParameterCollection => throw new NotSupportedException();
    public override void Cancel() => throw new NotSupportedException();
    public override int ExecuteNonQuery() => throw new NotSupportedException();
    public override object ExecuteScalar() => throw new NotSupportedException();
    public override void Prepare() => throw new NotSupportedException();
    protected override DbParameter CreateDbParameter() => throw new NotSupportedException();
    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior) => throw new NotSupportedException();
    protected override Task<DbDataReader> ExecuteDbDataReaderAsync(CommandBehavior behavior, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      commands.Add(CommandText);
      return Task.FromResult<DbDataReader>(catalog.CreateDataReader());
    }
    public override Task<int> ExecuteNonQueryAsync(CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      commands.Add(CommandText);
      if (CommandText.Contains("DROP DATABASE", StringComparison.OrdinalIgnoreCase)) { afterDrop?.Invoke(); }
      return Task.FromResult(1);
    }
  }
}
