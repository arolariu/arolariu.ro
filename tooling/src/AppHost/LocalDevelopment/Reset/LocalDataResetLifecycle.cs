namespace AppHost.LocalDevelopment.Reset;

using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.Diagnostics.HealthChecks;

/// <summary>Controls owned application executions using public native Aspire commands and snapshots.</summary>
internal sealed class LocalDataResetLifecycle(
  LocalDataResetResources resources,
  Func<IResource, string, CancellationToken, Task<ExecuteCommandResult>> executeCommand,
  Func<string, ResourceEvent?> currentState,
  Func<string, Func<ResourceEvent, bool>, CancellationToken, Task<ResourceEvent>> waitForState,
  Func<IResource, CancellationToken, Task> waitForDependencies)
{
  internal async Task StopWritersAsync(CancellationToken cancellationToken)
  {
    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    timeout.CancelAfter(TimeSpan.FromSeconds(30));
    Task stopped = Task.WhenAll(new[] { resources.Applications.Website, resources.Applications.Api,
      resources.Helpers.Bootstrap.Resource }.Select(resource => StopWriterAsync(resource, timeout.Token)));
    try { await stopped.ConfigureAwait(false); }
    catch (Exception) when (stopped.Exception is not null)
    {
      throw new AggregateException("Shutdown could not be confirmed for every native writer.", stopped.Exception.InnerExceptions);
    }
  }

  private async Task StopWriterAsync(IResource resource, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    ResourceEvent current = currentState(resource.Name)
      ?? throw new InvalidOperationException("Cannot prove the current state of a local writer.");
    if (IsStopped(current.Snapshot.State?.Text)) { return; }
    ExecuteCommandResult result = await executeCommand(resource, KnownResourceCommands.StopCommand, cancellationToken)
      .ConfigureAwait(false);
    if (!result.Success) { throw new InvalidOperationException("A native writer stop command failed."); }
    await waitForState(resource.Name, change => IsStopped(change.Snapshot.State?.Text), cancellationToken)
      .ConfigureAwait(false);
  }

  internal async Task RunBootstrapAsync(CancellationToken cancellationToken)
  {
    ResourceEvent completed = await StartAndObserveAsync(resources.Helpers.Bootstrap.Resource,
      change => IsStopped(change.Snapshot.State?.Text), cancellationToken).ConfigureAwait(false);
    if (completed.Snapshot.ExitCode != 0)
    {
      throw new InvalidOperationException("The new local scenario initializer did not exit successfully.");
    }
  }

  internal async Task ResumeApplicationsAsync(CancellationToken cancellationToken)
  {
    foreach (IResource dependency in new[] { resources.Applications.Exp, resources.Helpers.Identity.Resource })
    {
      ResourceEvent current = currentState(dependency.Name)
        ?? throw new InvalidOperationException("Cannot prove the current state of a local application dependency.");
      if (IsFreshHealthy(current, dependency)) { continue; }
      await StopWriterAsync(dependency, cancellationToken).ConfigureAwait(false);
      await waitForDependencies(dependency, cancellationToken).ConfigureAwait(false);
      await StartAndObserveAsync(dependency, change => IsFreshHealthy(change, dependency), cancellationToken).ConfigureAwait(false);
    }

    foreach (IResource resource in new[] { resources.Applications.Api, resources.Applications.Website })
    {
      await waitForDependencies(resource, cancellationToken).ConfigureAwait(false);
      await StartAndObserveAsync(resource, change => IsFreshHealthy(change, resource), cancellationToken).ConfigureAwait(false);
    }
  }

  private async Task<ResourceEvent> StartAndObserveAsync(
    IResource resource, Func<ResourceEvent, bool> completed, CancellationToken cancellationToken)
  {
    ResourceEvent? previous = currentState(resource.Name);
    using var observer = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    observer.CancelAfter(TimeSpan.FromMinutes(2));
    Task<ResourceEvent> wait = waitForState(resource.Name, change =>
    {
      bool fresh = change.Snapshot.StartTimeStamp is not null
        && (change.Snapshot.StartTimeStamp != previous?.Snapshot.StartTimeStamp || change.ResourceId != previous?.ResourceId);
      bool failed = change.Snapshot.State?.Text == KnownResourceStates.FailedToStart
        && !ReferenceEquals(change.Snapshot, previous?.Snapshot);
      return failed || (fresh && (completed(change) || IsStopped(change.Snapshot.State?.Text)));
    }, observer.Token);
    try
    {
      ExecuteCommandResult result = await executeCommand(resource, KnownResourceCommands.StartCommand, observer.Token)
        .ConfigureAwait(false);
      if (!result.Success) { throw new InvalidOperationException("A native resource start command failed."); }
      ResourceEvent outcome = await wait.ConfigureAwait(false);
      if (outcome.Snapshot.State?.Text == KnownResourceStates.FailedToStart
        || (IsStopped(outcome.Snapshot.State?.Text) && outcome.Snapshot.ExitCode is not 0)
        || !completed(outcome))
      {
        throw new InvalidOperationException("A newly requested local execution failed.");
      }
      return outcome;
    }
    catch
    {
      observer.Cancel();
      try { await wait.ConfigureAwait(false); }
      catch (Exception) { }
      throw;
    }
  }

  private static bool IsFreshHealthy(ResourceEvent change, IResource resource)
  {
    CustomResourceSnapshot snapshot = change.Snapshot;
    if (snapshot.State?.Text != KnownResourceStates.Running || snapshot.HealthStatus != HealthStatus.Healthy)
    {
      return false;
    }
    if (!resource.Annotations.OfType<HealthCheckAnnotation>().Any()) { return true; }
    return snapshot.HealthReports.Length > 0 && snapshot.HealthReports.All(report =>
      report.Status == HealthStatus.Healthy && report.LastRunAt is DateTime checkedAt
      && snapshot.StartTimeStamp is DateTime startedAt && checkedAt >= startedAt);
  }

  private static bool IsStopped(string? state) =>
    state == KnownResourceStates.NotStarted || state == KnownResourceStates.Exited
    || state == KnownResourceStates.Finished || state == KnownResourceStates.FailedToStart;
}
