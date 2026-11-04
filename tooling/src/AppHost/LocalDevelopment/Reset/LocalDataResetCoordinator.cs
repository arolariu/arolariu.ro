namespace AppHost.LocalDevelopment.Reset;

using Aspire.Hosting.ApplicationModel;

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
internal sealed class LocalDataResetCoordinator
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
    using var operation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    operation.CancelAfter(TimeSpan.FromMinutes(5));
    try
    {
      if (!await confirm(operation.Token).ConfigureAwait(false)) { return CommandResults.Canceled(); }
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
      if (!writersAffected)
      {
        return exception is OperationCanceledException
          ? CommandResults.Canceled()
          : CommandResults.Failure($"Local data reset failed during {phase}; no data was cleared.");
      }

      using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(30));
      try { await operations.StopWriters(cleanup.Token).ConfigureAwait(false); }
      catch (Exception)
      {
        return CommandResults.Failure(
          $"Local data reset failed during {phase}; data may be partially cleared. "
          + "Writer shutdown could not be confirmed; stop the AppHost before continuing.");
      }
      return CommandResults.Failure(
        $"Local data reset failed during {phase}; data may be partially cleared. Writers remain stopped.");
    }
    finally { Volatile.Write(ref busy, 0); }
  }
}
