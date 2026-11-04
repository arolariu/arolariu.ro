namespace AppHost.Tests.LocalDevelopment.Reset;

using Aspire.Hosting.ApplicationModel;
using Azure;
using global::AppHost.LocalDevelopment.Reset;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the reset's confirmation, ownership, ordering, and partial-failure contract.</summary>
[TestClass]
public sealed class LocalDataResetCoordinatorTests
{
  /// <summary>No lifecycle or store operation may occur when confirmation is declined.</summary>
  [TestMethod]
  public async Task ExecuteAsync_Declined_PerformsNoWork()
  {
    var operations = new List<string>();
    var coordinator = new LocalDataResetCoordinator();

    ExecuteCommandResult result = await coordinator.ExecuteAsync(_ => Task.FromResult(false),
      CreateOperations(operations), CancellationToken.None);

    Assert.IsTrue(result.Canceled);
    Assert.HasCount(0, operations);
    Assert.IsFalse(coordinator.IsBusy);
  }

  /// <summary>Complete target validation and writer quiescence precede every deletion.</summary>
  [TestMethod]
  public async Task ExecuteAsync_Confirmed_UsesSafeOrder()
  {
    var operations = new List<string>();
    var coordinator = new LocalDataResetCoordinator();

    ExecuteCommandResult result = await coordinator.ExecuteAsync(_ =>
    {
      operations.Add("confirm");
      return Task.FromResult(true);
    }, CreateOperations(operations), CancellationToken.None);

    Assert.IsTrue(result.Success);
    CollectionAssert.AreEqual(
      new[] { "confirm", "validate", "stop", "cosmos", "storage", "sql", "provision", "new-seed", "resume" }, operations);
    Assert.IsFalse(coordinator.IsBusy);
  }

  /// <summary>An unsafe final target cannot produce a partial clear of earlier valid targets.</summary>
  [TestMethod]
  public async Task ExecuteAsync_InvalidTarget_DoesNotStopOrClear()
  {
    var operations = new List<string>();
    ExecuteCommandResult result = await new LocalDataResetCoordinator().ExecuteAsync(_ => Task.FromResult(true),
      CreateOperations(operations, "validate"), CancellationToken.None);

    Assert.IsFalse(result.Success);
    CollectionAssert.AreEqual(new[] { "validate" }, operations);
  }

  /// <summary>Failure cannot resume partially cleared data, including failure partway through resumption.</summary>
  [TestMethod]
  [DataRow("cosmos")]
  [DataRow("storage")]
  [DataRow("sql")]
  [DataRow("provision")]
  [DataRow("new-seed")]
  [DataRow("resume")]
  public async Task ExecuteAsync_FailedPhase_LeavesWritersStopped(string phase)
  {
    var operations = new List<string>();

    ExecuteCommandResult result = await new LocalDataResetCoordinator().ExecuteAsync(_ => Task.FromResult(true),
      CreateOperations(operations, phase), CancellationToken.None);

    Assert.IsFalse(result.Success);
    Assert.AreEqual("stop", operations[^1]);
    Assert.AreEqual(2, operations.Count(operation => operation == "stop"));
    Assert.AreEqual(phase == "resume", operations.Contains("resume", StringComparer.Ordinal));
    StringAssert.Contains(result.Message, "partially");
  }

  /// <summary>The operation gate is acquired before a slow confirmation prompt.</summary>
  [TestMethod]
  public async Task ExecuteAsync_ConcurrentRequest_IsRejectedBeforePrompt()
  {
    var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    var release = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
    var coordinator = new LocalDataResetCoordinator();
    Task<ExecuteCommandResult> first = coordinator.ExecuteAsync(_ =>
    {
      entered.SetResult();
      return release.Task;
    }, CreateOperations([]), CancellationToken.None);
    await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
    bool secondPrompted = false;
    ExecuteCommandResult second = await coordinator.ExecuteAsync(_ =>
    {
      secondPrompted = true;
      return Task.FromResult(true);
    }, CreateOperations([]), CancellationToken.None);
    release.SetResult(false);
    await first;

    Assert.IsFalse(second.Success);
    Assert.IsFalse(secondPrompted);
    Assert.IsFalse(coordinator.IsBusy);
  }

  /// <summary>Cancellation waits for seed cancellation and stops writers with an independent cleanup token.</summary>
  [TestMethod]
  public async Task ExecuteAsync_CancelledDuringSeed_StopsBeforeReturningFailure()
  {
    using var source = new CancellationTokenSource();
    var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    var operations = new List<string>();
    LocalDataResetOperations actions = CreateOperations(operations) with
    {
      Initialize = async token =>
      {
        operations.Add("new-seed");
        entered.SetResult();
        await Task.Delay(Timeout.InfiniteTimeSpan, token);
      },
      StopWriters = token =>
      {
        token.ThrowIfCancellationRequested();
        operations.Add("stop");
        return Task.CompletedTask;
      },
    };
    Task<ExecuteCommandResult> pending = new LocalDataResetCoordinator().ExecuteAsync(_ => Task.FromResult(true), actions, source.Token);
    await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
    source.Cancel();

    ExecuteCommandResult result = await pending;

    Assert.IsFalse(result.Success);
    Assert.AreEqual("stop", operations[^1]);
    Assert.IsFalse(operations.Contains("resume", StringComparer.Ordinal));
  }

  /// <summary>Reading the confirmation dialog cannot consume the destructive operation's budget.</summary>
  [TestMethod]
  public async Task ExecuteAsync_SlowConfirmation_ReceivesFullBudgetAfterApproval()
  {
    var clock = new ControlledTimeProvider();
    var coordinator = new LocalDataResetCoordinator(clock);
    var confirmation = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
    var operations = new List<string>();
    Task<ExecuteCommandResult> pending = coordinator.ExecuteAsync(_ => confirmation.Task,
      CreateOperations(operations), CancellationToken.None);

    clock.Advance(TimeSpan.FromMinutes(20));
    confirmation.SetResult(true);
    ExecuteCommandResult result = await pending;

    Assert.IsTrue(result.Success, result.Message);
    Assert.IsTrue(operations.Contains("resume", StringComparer.Ordinal));
  }

  /// <summary>Confirmed work still has the full bounded deadline and failure cleanup.</summary>
  [TestMethod]
  public async Task ExecuteAsync_ConfirmedWork_HonorsFiveMinuteBudget()
  {
    var clock = new ControlledTimeProvider();
    var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    var operations = new List<string>();
    LocalDataResetOperations actions = CreateOperations(operations) with
    {
      Initialize = async token =>
      {
        entered.SetResult();
        await Task.Delay(Timeout.InfiniteTimeSpan, token);
      },
    };
    Task<ExecuteCommandResult> pending = new LocalDataResetCoordinator(clock)
      .ExecuteAsync(_ => Task.FromResult(true), actions, CancellationToken.None);
    await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));

    clock.Advance(TimeSpan.FromMinutes(5) - TimeSpan.FromSeconds(1));
    Assert.IsFalse(pending.IsCompleted);
    clock.Advance(TimeSpan.FromSeconds(1));
    ExecuteCommandResult result = await pending;

    Assert.IsFalse(result.Success);
    Assert.AreEqual("stop", operations[^1]);
    Assert.IsFalse(operations.Contains("resume", StringComparer.Ordinal));
  }

  /// <summary>Provider failure codes remain actionable without exposing provider messages or credentials.</summary>
  [TestMethod]
  public async Task ExecuteAsync_ProviderFailure_ReportsSanitizedCauseAndResource()
  {
    LocalDataResetOperations actions = CreateOperations([]) with
    {
      ClearStorage = _ => Task.FromException(new RequestFailedException(503,
        "AccountKey=provider-secret", "ServerBusy", null)),
    };

    ExecuteCommandResult result = await new LocalDataResetCoordinator()
      .ExecuteAsync(_ => Task.FromResult(true), actions, CancellationToken.None);

    StringAssert.Contains(result.Message, "storage");
    StringAssert.Contains(result.Message, "503");
    StringAssert.Contains(result.Message, "ServerBusy");
    Assert.IsFalse(result.Message.Contains("provider-secret", StringComparison.Ordinal));
  }

  /// <summary>A failed cleanup cannot erase the primary provider failure from diagnostics.</summary>
  [TestMethod]
  public async Task ExecuteAsync_CleanupFails_RetainsPrimaryAndCleanupDiagnostics()
  {
    int stops = 0;
    LocalDataResetOperations actions = CreateOperations([]) with
    {
      ClearStorage = _ => Task.FromException(new RequestFailedException(503,
        "AccountKey=provider-secret", "ServerBusy", null)),
      StopWriters = _ => ++stops == 1 ? Task.CompletedTask
        : Task.FromException(new IOException("Password=cleanup-secret")),
    };

    ExecuteCommandResult result = await new LocalDataResetCoordinator()
      .ExecuteAsync(_ => Task.FromResult(true), actions, CancellationToken.None);

    StringAssert.Contains(result.Message, "ServerBusy");
    StringAssert.Contains(result.Message, "IOException");
    Assert.IsFalse(result.Message.Contains("provider-secret", StringComparison.Ordinal));
    Assert.IsFalse(result.Message.Contains("cleanup-secret", StringComparison.Ordinal));
  }

  private static LocalDataResetOperations CreateOperations(List<string> operations, string? failure = null)
  {
    Task Step(string name, CancellationToken token)
    {
      token.ThrowIfCancellationRequested();
      operations.Add(name);
      if (name == failure) { throw new InvalidOperationException("Synthetic external failure."); }
      return Task.CompletedTask;
    }
    return new(token => Step("validate", token), token => Step("stop", token),
      token => Step("cosmos", token), token => Step("storage", token), token => Step("sql", token),
      token => Step("provision", token), token => Step("new-seed", token), token => Step("resume", token));
  }

  private sealed class ControlledTimeProvider : TimeProvider
  {
    private readonly List<ControlledTimer> timers = [];
    private DateTimeOffset now = DateTimeOffset.UnixEpoch;

    public override DateTimeOffset GetUtcNow() => now;

    public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
    {
      var timer = new ControlledTimer(this, callback, state);
      timer.Change(dueTime, period);
      timers.Add(timer);
      return timer;
    }

    internal void Advance(TimeSpan amount)
    {
      now += amount;
      foreach (ControlledTimer timer in timers.ToArray()) { timer.Fire(now); }
    }

    private sealed class ControlledTimer(ControlledTimeProvider clock, TimerCallback callback, object? state) : ITimer
    {
      private DateTimeOffset? due;
      private TimeSpan period;
      private bool disposed;

      public bool Change(TimeSpan dueTime, TimeSpan nextPeriod)
      {
        if (disposed) { return false; }
        due = dueTime == Timeout.InfiniteTimeSpan ? null : clock.now + dueTime;
        period = nextPeriod;
        return true;
      }

      internal void Fire(DateTimeOffset current)
      {
        if (disposed || due is not DateTimeOffset deadline || deadline > current) { return; }
        due = period == Timeout.InfiniteTimeSpan ? null : current + period;
        callback(state);
      }

      public void Dispose() { disposed = true; due = null; }

      public ValueTask DisposeAsync() { Dispose(); return ValueTask.CompletedTask; }
    }
  }
}
