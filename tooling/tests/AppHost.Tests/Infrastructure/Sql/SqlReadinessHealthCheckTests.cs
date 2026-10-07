namespace AppHost.Tests.Infrastructure.Sql;

using System.Data;
using System.Data.Common;
using System.Diagnostics.CodeAnalysis;
using global::AppHost.Infrastructure.Sql;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies readiness executes a real check against a controlled database boundary.</summary>
[TestClass]
public sealed class SqlReadinessHealthCheckTests
{
  /// <summary>Verifies a query completion race cannot report cancelled readiness as healthy.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_CancelledAtQueryCompletion_ThrowsCancellation()
  {
    using var source = new CancellationTokenSource();
    var connection = new RecordingConnection();
    connection.Command.AfterExecute = source.Cancel;
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      new SqlReadinessHealthCheck(() => connection).CheckHealthAsync(new HealthCheckContext(), source.Token));
    Assert.IsTrue(connection.IsDisposed);
    Assert.IsTrue(connection.Command.IsDisposed);
  }

  /// <summary>Verifies cancellation reaches both database operations and resources are disposed.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_Success_ForwardsTokenAndDisposesResources()
  {
    using var source = new CancellationTokenSource();
    var connection = new RecordingConnection();
    var check = new SqlReadinessHealthCheck(() => connection);

    HealthCheckResult result = await check.CheckHealthAsync(new HealthCheckContext(), source.Token);

    Assert.AreEqual(HealthStatus.Healthy, result.Status);
    Assert.AreEqual(source.Token, connection.OpenToken);
    Assert.AreEqual(source.Token, connection.Command.ExecuteToken);
    Assert.AreEqual("SELECT 1", connection.Command.CommandText);
    Assert.IsTrue(connection.IsDisposed);
    Assert.IsTrue(connection.Command.IsDisposed);
  }

  /// <summary>Verifies an unavailable database reports the original failure.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_DatabaseFailure_ReturnsUnhealthy()
  {
    var failure = new TestDbException();
    var connection = new RecordingConnection { Failure = failure };
    HealthCheckResult result = await new SqlReadinessHealthCheck(() => connection)
      .CheckHealthAsync(new HealthCheckContext());

    Assert.AreEqual(HealthStatus.Unhealthy, result.Status);
    Assert.AreSame(failure, result.Exception);
    Assert.IsTrue(connection.IsDisposed);
  }

  /// <summary>Verifies cancellation during opening cannot be classified as database failure.</summary>
  [TestMethod]
  public async Task CheckHealthAsync_CancelledAfterOpen_ThrowsCancellation()
  {
    using var source = new CancellationTokenSource();
    var connection = new RecordingConnection { AfterOpen = source.Cancel };
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      new SqlReadinessHealthCheck(() => connection).CheckHealthAsync(new HealthCheckContext(), source.Token));
    Assert.AreEqual(source.Token, connection.Command.ExecuteToken);
    Assert.IsTrue(connection.IsDisposed);
  }

  private sealed class TestDbException() : DbException("database unavailable");

  private sealed class RecordingConnection : DbConnection
  {
    internal CancellationToken OpenToken { get; private set; }
    internal RecordingCommand Command { get; } = new();
    internal Exception? Failure { get; init; }
    internal Action? AfterOpen { get; init; }
    internal bool IsDisposed { get; private set; }
    [AllowNull]
    public override string ConnectionString { get; set; } = "";
    public override string Database => "master";
    public override string DataSource => "local";
    public override string ServerVersion => "1";
    public override ConnectionState State => ConnectionState.Open;
    public override void ChangeDatabase(string databaseName) => throw new NotSupportedException();
    public override void Close() { }
    public override void Open() => throw new NotSupportedException();
    public override Task OpenAsync(CancellationToken cancellationToken)
    {
      OpenToken = cancellationToken;
      cancellationToken.ThrowIfCancellationRequested();
      if (Failure is not null) { return Task.FromException(Failure); }
      AfterOpen?.Invoke();
      return Task.CompletedTask;
    }
    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) =>
      throw new NotSupportedException();
    protected override DbCommand CreateDbCommand() => Command;
    protected override void Dispose(bool disposing) { IsDisposed = true; base.Dispose(disposing); }
  }

  private sealed class RecordingCommand : DbCommand
  {
    internal Action? AfterExecute { get; set; }
    internal CancellationToken ExecuteToken { get; private set; }
    internal bool IsDisposed { get; private set; }
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
    public override Task<object?> ExecuteScalarAsync(CancellationToken cancellationToken)
    {
      ExecuteToken = cancellationToken;
      cancellationToken.ThrowIfCancellationRequested();
      AfterExecute?.Invoke();
      return Task.FromResult<object?>(1);
    }
    public override void Prepare() => throw new NotSupportedException();
    protected override DbParameter CreateDbParameter() => throw new NotSupportedException();
    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior) =>
      throw new NotSupportedException();
    protected override void Dispose(bool disposing) { IsDisposed = true; base.Dispose(disposing); }
  }
}
