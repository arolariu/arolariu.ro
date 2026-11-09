namespace AppHost.Tests.LocalDevelopment.Reset;

using Aspire.Hosting.ApplicationModel;
using global::AppHost.LocalDevelopment.Reset;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Exercises the public Aspire command/snapshot boundary without starting developer applications.</summary>
[TestClass]
public sealed class LocalDataResetLifecycleTests
{
  private static readonly DateTime PreviousStart = new(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);
  private static readonly DateTime NextStart = new(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc);

  /// <summary>A previous successful seed cannot satisfy the wait for the requested new execution.</summary>
  [TestMethod]
  public async Task RunBootstrapAsync_CachedSuccess_WaitsForNewExecution()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));

    Task pending = runtime.CreateLifecycle().RunBootstrapAsync(timeout.Token);

    Assert.IsFalse(pending.IsCompleted);
    runtime.Publish(resources.Helpers.Bootstrap.Resource, KnownResourceStates.Exited, NextStart, 0);
    await pending;
  }

  /// <summary>The new execution may complete before a Running snapshot can be observed.</summary>
  [TestMethod]
  public async Task RunBootstrapAsync_FastCompletion_AcceptsNewTimestamp()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    runtime.OnCommand = (resource, command) =>
    {
      if (command == KnownResourceCommands.StartCommand)
      {
        runtime.Publish(resource, KnownResourceStates.Exited, NextStart, 0);
      }
    };

    await runtime.CreateLifecycle().RunBootstrapAsync(CancellationToken.None);

    Assert.IsTrue(runtime.Commands.Any(command => command == ("local-bootstrap", KnownResourceCommands.StartCommand)));
  }

  /// <summary>A nonzero new seed exit must leave application resumption to the failure path.</summary>
  [TestMethod]
  public async Task RunBootstrapAsync_FailedExecution_Throws()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    runtime.OnCommand = (resource, command) =>
    {
      if (command == KnownResourceCommands.StartCommand)
      {
        runtime.Publish(resource, KnownResourceStates.Exited, NextStart, 1);
      }
    };

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(() =>
      runtime.CreateLifecycle().RunBootstrapAsync(CancellationToken.None));
  }

  /// <summary>A waiting initializer remains a potential writer until its native stop has completed.</summary>
  [TestMethod]
  public async Task StopWritersAsync_WaitingInitializer_StopsBeforeReturning()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    runtime.Publish(resources.Helpers.Bootstrap.Resource, KnownResourceStates.Waiting, null, null);

    await runtime.CreateLifecycle().StopWritersAsync(CancellationToken.None);

    Assert.IsTrue(runtime.Commands.Contains(("local-bootstrap", KnownResourceCommands.StopCommand)));
    Assert.AreEqual(KnownResourceStates.NotStarted, runtime.Current("local-bootstrap")?.Snapshot.State?.Text);
  }

  /// <summary>A failed stop must not prevent shutdown attempts for the other potentially active writers.</summary>
  [TestMethod]
  [DataRow("website")]
  [DataRow("api")]
  public async Task StopWritersAsync_WriterStopFails_AttemptsEveryWriterAndAggregatesFailure(string failingWriter)
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    foreach (IResource writer in new[] { resources.Applications.Website, resources.Applications.Api,
      resources.Helpers.Bootstrap.Resource })
    {
      runtime.Publish(writer, KnownResourceStates.Running, NextStart, null);
    }
    runtime.OnCommand = (resource, command) =>
    {
      if (resource.Name == failingWriter && command == KnownResourceCommands.StopCommand)
      {
        throw new InvalidOperationException("The external native stop failed.");
      }
    };
    Exception? failure = null;

    try { await runtime.CreateLifecycle().StopWritersAsync(CancellationToken.None); }
    catch (Exception exception) when (exception is InvalidOperationException or AggregateException) { failure = exception; }

    CollectionAssert.AreEquivalent(new[]
    {
      ("website", KnownResourceCommands.StopCommand), ("api", KnownResourceCommands.StopCommand),
      ("local-bootstrap", KnownResourceCommands.StopCommand),
    }, runtime.Commands);
    Assert.IsInstanceOfType<AggregateException>(failure);
    Assert.HasCount(1, ((AggregateException)failure).InnerExceptions);
  }

  /// <summary>Old health reports cannot report a newly started API ready or start the website early.</summary>
  [TestMethod]
  public async Task ResumeApplicationsAsync_StaleHealth_WaitsForFreshProbe()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    runtime.OnCommand = (resource, command) =>
    {
      if (resource.Name == "website" && command == KnownResourceCommands.StartCommand)
      {
        runtime.Publish(resource, KnownResourceStates.Running, NextStart, null, NextStart.AddSeconds(1));
      }
    };
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));

    Task pending = runtime.CreateLifecycle().ResumeApplicationsAsync(timeout.Token);
    runtime.Publish(resources.Applications.Api, KnownResourceStates.Running, PreviousStart, null, PreviousStart.AddSeconds(1));
    Assert.IsFalse(pending.IsCompleted);
    runtime.Publish(resources.Applications.Api, KnownResourceStates.Running, NextStart, null, PreviousStart.AddSeconds(1));
    Assert.IsFalse(pending.IsCompleted);
    Assert.IsFalse(runtime.Commands.Any(command => command.Resource == "website"));
    runtime.Publish(resources.Applications.Api, KnownResourceStates.Running, NextStart, null, NextStart.AddSeconds(1));

    await pending;

    CollectionAssert.AreEqual(
      new[] { ("api", KnownResourceCommands.StartCommand), ("website", KnownResourceCommands.StartCommand) }, runtime.Commands);
  }

  /// <summary>A serving application exiting with zero is still not a healthy serving application.</summary>
  [TestMethod]
  public async Task ResumeApplicationsAsync_ApiExitsSuccessfully_RefusesWebsiteStart()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    runtime.OnCommand = (resource, command) =>
    {
      if (command == KnownResourceCommands.StartCommand)
      {
        runtime.Publish(resource, resource.Name == "api" ? KnownResourceStates.Exited : KnownResourceStates.Running,
          NextStart, resource.Name == "api" ? 0 : null, NextStart.AddSeconds(1));
      }
    };

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(() =>
      runtime.CreateLifecycle().ResumeApplicationsAsync(CancellationToken.None));

    Assert.IsFalse(runtime.Commands.Any(command => command.Resource == "website"));
  }

  /// <summary>A failed initial Bootstrap cannot strand exp and identity before API recovery.</summary>
  [TestMethod]
  public async Task ResumeApplicationsAsync_FailedDependencies_RecoversBeforeApi()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    runtime.Publish(resources.Applications.Exp, KnownResourceStates.FailedToStart, null, 1);
    runtime.Publish(resources.Helpers.Identity.Resource, KnownResourceStates.FailedToStart, null, 1);
    runtime.OnWaitForDependencies = (resource, _) =>
    {
      if (resource.Name == "api")
      {
        Assert.AreEqual(KnownResourceStates.Running, runtime.Current("exp")?.Snapshot.State?.Text);
        Assert.AreEqual(KnownResourceStates.Running, runtime.Current("local-identities")?.Snapshot.State?.Text);
      }
      return Task.CompletedTask;
    };
    runtime.OnCommand = (resource, command) =>
    {
      if (command == KnownResourceCommands.StartCommand)
      {
        runtime.Publish(resource, KnownResourceStates.Running, NextStart, null, NextStart.AddSeconds(1));
      }
    };

    await runtime.CreateLifecycle().ResumeApplicationsAsync(CancellationToken.None);

    CollectionAssert.AreEqual(new[]
    {
      ("exp", KnownResourceCommands.StartCommand), ("local-identities", KnownResourceCommands.StartCommand),
      ("api", KnownResourceCommands.StartCommand), ("website", KnownResourceCommands.StartCommand),
    }, runtime.Commands);
  }

  /// <summary>A failed prerequisite recovery must not start writers against an unavailable dependency.</summary>
  [TestMethod]
  public async Task ResumeApplicationsAsync_DependencyRecoveryFails_DoesNotStartApi()
  {
    LocalDataResetResources resources = LocalDataResetSafetyTests.CreateResources();
    var runtime = new NativeBoundary(resources);
    runtime.Publish(resources.Applications.Exp, KnownResourceStates.FailedToStart, null, 1);
    runtime.OnCommand = (resource, command) =>
    {
      if (command == KnownResourceCommands.StartCommand)
      {
        runtime.Publish(resource, resource.Name == "exp" ? KnownResourceStates.FailedToStart : KnownResourceStates.Running,
          NextStart, resource.Name == "exp" ? 1 : null, NextStart.AddSeconds(1));
      }
    };

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(() =>
      runtime.CreateLifecycle().ResumeApplicationsAsync(CancellationToken.None));

    Assert.IsFalse(runtime.Commands.Any(command => command.Resource is "api" or "website"));
  }

  private sealed class NativeBoundary
  {
    private readonly LocalDataResetResources resources;
    private readonly Dictionary<string, ResourceEvent> states = new(StringComparer.Ordinal);
    private readonly List<(string Name, Func<ResourceEvent, bool> Predicate, TaskCompletionSource<ResourceEvent> Completion)> waits = [];
    internal List<(string Resource, string Command)> Commands { get; } = [];
    internal Action<IResource, string>? OnCommand { get; set; }
    internal Func<IResource, CancellationToken, Task> OnWaitForDependencies { get; set; } = (_, _) => Task.CompletedTask;

    internal NativeBoundary(LocalDataResetResources resources)
    {
      this.resources = resources;
      Publish(resources.Applications.Api, KnownResourceStates.Exited, PreviousStart, 0);
      Publish(resources.Applications.Website, KnownResourceStates.Exited, PreviousStart, 0);
      Publish(resources.Helpers.Bootstrap.Resource, KnownResourceStates.Exited, PreviousStart, 0);
      Publish(resources.Applications.Exp, KnownResourceStates.Running, PreviousStart, null, PreviousStart.AddSeconds(1));
      Publish(resources.Helpers.Identity.Resource, KnownResourceStates.Running, PreviousStart, null, PreviousStart.AddSeconds(1));
    }

    internal LocalDataResetLifecycle CreateLifecycle() => new(resources, ExecuteAsync, Current, WaitAsync, OnWaitForDependencies);

    internal ResourceEvent? Current(string name) => states.GetValueOrDefault(name);

    internal void Publish(IResource resource, string state, DateTime? start, int? exit, DateTime? checkedAt = null)
    {
      var snapshot = new CustomResourceSnapshot
      {
        ResourceType = "test",
        Properties = [],
        State = state,
        StartTimeStamp = start,
        ExitCode = exit,
      };
      if (checkedAt is DateTime time)
      {
        snapshot = snapshot.WithHealthReports([new HealthReportSnapshot("http", HealthStatus.Healthy, null, null) { LastRunAt = time }]);
      }
      var change = new ResourceEvent(resource, $"{resource.Name}-instance", snapshot);
      states[resource.Name] = change;
      foreach (var wait in waits.ToArray())
      {
        if (wait.Name == resource.Name && wait.Predicate(change))
        {
          waits.Remove(wait);
          wait.Completion.TrySetResult(change);
        }
      }
    }

    private Task<ExecuteCommandResult> ExecuteAsync(IResource resource, string command, CancellationToken token)
    {
      token.ThrowIfCancellationRequested();
      Commands.Add((resource.Name, command));
      OnCommand?.Invoke(resource, command);
      if (command == KnownResourceCommands.StopCommand)
      {
        Publish(resource, KnownResourceStates.NotStarted, Current(resource.Name)?.Snapshot.StartTimeStamp, null);
      }
      return Task.FromResult(CommandResults.Success());
    }

    private Task<ResourceEvent> WaitAsync(string name, Func<ResourceEvent, bool> predicate, CancellationToken token)
    {
      if (Current(name) is ResourceEvent current && predicate(current)) { return Task.FromResult(current); }
      var completion = new TaskCompletionSource<ResourceEvent>(TaskCreationOptions.RunContinuationsAsynchronously);
      waits.Add((name, predicate, completion));
      return AwaitAsync(completion, token);
    }

    private static async Task<ResourceEvent> AwaitAsync(TaskCompletionSource<ResourceEvent> completion, CancellationToken token)
    {
      using CancellationTokenRegistration registration = token.Register(() => completion.TrySetCanceled(token));
      return await completion.Task;
    }
  }
}
