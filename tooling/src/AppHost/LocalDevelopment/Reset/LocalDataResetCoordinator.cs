namespace AppHost.LocalDevelopment.Reset;

using Aspire.Hosting.ApplicationModel;
using Azure;
using Microsoft.Azure.Cosmos;
using Microsoft.Data.SqlClient;

/// <summary>Contains this reset's fixed external I/O boundaries.</summary>
internal sealed record LocalDataResetOperations(
  Func<CancellationToken, Task> ValidateTargets,
  Func<CancellationToken, Task> StopWriters,
  Func<CancellationToken, Task> ClearCosmos,
  Func<CancellationToken, Task> ClearStorage,
  Func<CancellationToken, Task> ClearSql,
  Func<CancellationToken, Task> Provision,
  Func<CancellationToken, Task> Initialize,
  Func<CancellationToken, Task> Resume);

/// <summary>Serializes a confirmed reset and keeps writers stopped after incomplete work.</summary>
internal sealed class LocalDataResetCoordinator(TimeProvider? timeProvider = null)
{
  private int busy;
  internal bool IsBusy => Volatile.Read(ref busy) != 0;

  internal async Task<ExecuteCommandResult> ExecuteAsync(
    Func<CancellationToken, Task<bool>> confirm,
    LocalDataResetOperations operations,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(confirm);
    ArgumentNullException.ThrowIfNull(operations);
    if (cancellationToken.IsCancellationRequested) { return CommandResults.Canceled(); }
    if (Interlocked.CompareExchange(ref busy, 1, 0) != 0)
    {
      return CommandResults.Failure("A local data reset is already in progress.");
    }

    bool writersAffected = false;
    string phase = "confirmation";
    try
    {
      if (!await confirm(cancellationToken).ConfigureAwait(false)) { return CommandResults.Canceled(); }
      cancellationToken.ThrowIfCancellationRequested();
      using var budget = new CancellationTokenSource(TimeSpan.FromMinutes(5), timeProvider ?? TimeProvider.System);
      using var operation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, budget.Token);
      operation.Token.ThrowIfCancellationRequested();
      phase = "target validation";
      await operations.ValidateTargets(operation.Token).ConfigureAwait(false);
      phase = "writer shutdown";
      writersAffected = true;
      await operations.StopWriters(operation.Token).ConfigureAwait(false);
      phase = "Cosmos clearing";
      await operations.ClearCosmos(operation.Token).ConfigureAwait(false);
      phase = "storage clearing";
      await operations.ClearStorage(operation.Token).ConfigureAwait(false);
      phase = "SQL clearing";
      await operations.ClearSql(operation.Token).ConfigureAwait(false);
      phase = "prerequisite provisioning";
      await operations.Provision(operation.Token).ConfigureAwait(false);
      phase = "scenario initialization";
      await operations.Initialize(operation.Token).ConfigureAwait(false);
      phase = "application resumption";
      await operations.Resume(operation.Token).ConfigureAwait(false);
      operation.Token.ThrowIfCancellationRequested();
      return CommandResults.Success("Local data reset completed; Alice, Bob, Charlie, and Dmitryi restored.");
    }
    catch (Exception exception)
    {
      string failure = $"resource={ResourceForPhase(phase)}; cause={DescribeFailure(exception)}";
      if (!writersAffected)
      {
        return exception is OperationCanceledException
          ? CommandResults.Canceled()
          : CommandResults.Failure($"Local data reset failed during {phase}; {failure}; no data was cleared.");
      }

      using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(30));
      try { await operations.StopWriters(cleanup.Token).ConfigureAwait(false); }
      catch (Exception cleanupException)
      {
        return CommandResults.Failure(
          $"Local data reset failed during {phase}; {failure}; data may be partially cleared. "
          + $"Shutdown cleanup failed: {DescribeFailure(cleanupException)}. "
          + "Writer shutdown could not be confirmed; stop the AppHost before continuing.");
      }
      return CommandResults.Failure(
        $"Local data reset failed during {phase}; {failure}; data may be partially cleared. Writers remain stopped.");
    }
    finally { Volatile.Write(ref busy, 0); }
  }

  private static string ResourceForPhase(string phase) => phase switch
  {
    "Cosmos clearing" => "cosmos",
    "storage clearing" => "storage",
    "SQL clearing" => "mssql",
    "scenario initialization" => "local-bootstrap",
    "application resumption" => "exp/local-identities/api/website",
    "writer shutdown" => "local-bootstrap/api/website",
    _ => "local reset targets",
  };

  private static string DescribeFailure(Exception exception) => exception switch
  {
    CosmosException cosmos => FormattableString.Invariant($"CosmosException (HTTP {cosmos.StatusCode:D}, substatus {cosmos.SubStatusCode})"),
    RequestFailedException azure => FormattableString.Invariant($"RequestFailedException (HTTP {azure.Status}, code {SafeErrorCode(azure.ErrorCode)})"),
    SqlException sql => FormattableString.Invariant($"SqlException (number {sql.Number}, state {sql.State}, class {sql.Class})"),
    OperationCanceledException => "OperationCanceledException (cancellation or operation deadline)",
    AggregateException aggregate => string.Join(" | ", aggregate.Flatten().InnerExceptions.Take(3).Select(DescribeFailure)),
    _ => FormattableString.Invariant($"{exception.GetType().Name} (HRESULT 0x{exception.HResult:X8})"),
  };

  private static string SafeErrorCode(string? code) =>
    !string.IsNullOrEmpty(code) && code.Length <= 80 && code.All(character => char.IsAsciiLetterOrDigit(character) || character is '_' or '-' or '.')
      ? code : "unavailable";
}
