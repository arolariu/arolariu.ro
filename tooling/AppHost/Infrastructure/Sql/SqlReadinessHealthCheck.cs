namespace AppHost.Infrastructure.Sql;

using System.Data.Common;
using Microsoft.Extensions.Diagnostics.HealthChecks;

/// <summary>Checks TDS readiness without consuming shutdown cancellation.</summary>
internal sealed class SqlReadinessHealthCheck(Func<DbConnection> createConnection) : IHealthCheck
{
  /// <inheritdoc />
  public async Task<HealthCheckResult> CheckHealthAsync(
    HealthCheckContext context, CancellationToken cancellationToken = default)
  {
    cancellationToken.ThrowIfCancellationRequested();
    try
    {
      await using DbConnection connection = createConnection();
      await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
      await using DbCommand command = connection.CreateCommand();
      command.CommandText = "SELECT 1";
      await command.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
      return HealthCheckResult.Healthy();
    }
    catch (DbException exception)
    {
      return HealthCheckResult.Unhealthy("Local SQL readiness query failed.", exception);
    }
    catch (InvalidOperationException exception)
    {
      return HealthCheckResult.Unhealthy("Local SQL readiness connection failed.", exception);
    }
  }
}
