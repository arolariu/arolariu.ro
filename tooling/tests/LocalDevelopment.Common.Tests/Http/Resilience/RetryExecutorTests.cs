namespace LocalDevelopment.Common.Tests.Http.Resilience;

using global::LocalDevelopment.Common.Http.Resilience;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using RetryContext = global::LocalDevelopment.Common.Http.Resilience.RetryContext;

/// <summary>Verifies bounded attempts, configured delays, failure identity, and isolated execution state.</summary>
[TestClass]
public sealed class RetryExecutorTests
{
  /// <summary>Verifies configured linear and exponential schedules use one-based failed attempts.</summary>
  /// <param name="exponential">Whether to use doubling delays instead of linear delays.</param>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public async Task ExecuteAsync_ConfiguredSchedule_UsesExpectedDelaysAndContext(bool exponential)
  {
    int maxAttempts = exponential ? 5 : 6;
    int calls = 0;
    var failure = new IOException("Temporary failure.");
    var contexts = new List<RetryContext>();
    var delays = new List<TimeSpan>();
    var policy = new RetryPolicy("configured", maxAttempts,
      attempt => TimeSpan.FromSeconds(exponential ? Math.Pow(2, attempt - 1) : attempt),
      static (_, _) => true);

    await RetryExecutor.ExecuteAsync(policy, _ =>
    {
      calls++;
      return calls < maxAttempts ? Task.FromException(failure) : Task.CompletedTask;
    }, CancellationToken.None, context =>
    {
      contexts.Add(context);
      return Task.CompletedTask;
    }, (wait, _) =>
    {
      delays.Add(wait);
      return Task.CompletedTask;
    }).ConfigureAwait(false);

    TimeSpan[] expected = exponential
      ? [TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(4), TimeSpan.FromSeconds(8)]
      : [TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(4), TimeSpan.FromSeconds(5)];
    Assert.AreEqual(maxAttempts, calls);
    CollectionAssert.AreEqual(expected, delays);
    Assert.HasCount(maxAttempts - 1, contexts);
    for (int index = 0; index < contexts.Count; index++)
    {
      Assert.AreSame(failure, contexts[index].Exception);
      Assert.AreEqual(index + 1, contexts[index].Attempt);
      Assert.AreEqual(maxAttempts, contexts[index].MaxAttempts);
      Assert.AreEqual(expected[index], contexts[index].Delay);
    }
  }

  /// <summary>Verifies successful operations never invoke failure-related delegates.</summary>
  [TestMethod]
  public async Task ExecuteAsync_ImmediateSuccess_DoesNotClassifyLogOrDelay()
  {
    int calls = 0;
    int unexpectedCalls = 0;
    var policy = new RetryPolicy("success", 3, _ =>
    {
      unexpectedCalls++;
      return TimeSpan.Zero;
    }, (_, _) =>
    {
      unexpectedCalls++;
      return true;
    });

    await RetryExecutor.ExecuteAsync(policy, _ =>
    {
      calls++;
      return Task.CompletedTask;
    }, CancellationToken.None, _ =>
    {
      unexpectedCalls++;
      return Task.CompletedTask;
    }, (_, _) =>
    {
      unexpectedCalls++;
      return Task.CompletedTask;
    }).ConfigureAwait(false);

    Assert.AreEqual(1, calls);
    Assert.AreEqual(0, unexpectedCalls);
  }

  /// <summary>Verifies the total attempt budget, no classification after exhaustion, and exact final exception identity.</summary>
  /// <param name="maxAttempts">The total attempt budget.</param>
  /// <param name="synchronousFailure">Whether the operation throws before returning a task.</param>
  [TestMethod]
  [DataRow(1, false)]
  [DataRow(3, false)]
  [DataRow(3, true)]
  public async Task ExecuteAsync_Exhausted_ThrowsExactLastFailure(int maxAttempts, bool synchronousFailure)
  {
    int calls = 0;
    int classifications = 0;
    int callbacks = 0;
    int delays = 0;
    IOException? lastFailure = null;
    RetryPolicy policy = CreatePolicy(maxAttempts) with
    {
      ShouldRetry = (_, _) =>
      {
        classifications++;
        return true;
      },
    };

    IOException actual = await Assert.ThrowsExactlyAsync<IOException>(() =>
      RetryExecutor.ExecuteAsync(policy, _ =>
      {
        calls++;
        lastFailure = new IOException("Attempt failed.");
        if (synchronousFailure)
        {
          throw lastFailure;
        }

        return Task.FromException(lastFailure);
      }, CancellationToken.None, _ =>
      {
        callbacks++;
        return Task.CompletedTask;
      }, (_, _) =>
      {
        delays++;
        return Task.CompletedTask;
      })).ConfigureAwait(false);

    Assert.AreSame(lastFailure, actual);
    Assert.AreEqual(maxAttempts, calls);
    Assert.AreEqual(maxAttempts - 1, classifications);
    Assert.AreEqual(maxAttempts - 1, callbacks);
    Assert.AreEqual(maxAttempts - 1, delays);
  }

  /// <summary>Verifies policy rejection surfaces the same failure without logging or waiting.</summary>
  [TestMethod]
  public async Task ExecuteAsync_PermanentFailure_ThrowsImmediately()
  {
    int calls = 0;
    int classifications = 0;
    int retryWork = 0;
    var failure = new InvalidOperationException("Permanent failure.");
    RetryPolicy policy = CreatePolicy() with
    {
      ShouldRetry = (_, _) =>
      {
        classifications++;
        return false;
      },
      GetDelay = _ =>
      {
        retryWork++;
        return TimeSpan.Zero;
      },
    };

    InvalidOperationException actual = await Assert.ThrowsExactlyAsync<InvalidOperationException>(() =>
      RetryExecutor.ExecuteAsync(policy, _ =>
      {
        calls++;
        return Task.FromException(failure);
      }, CancellationToken.None, _ =>
      {
        retryWork++;
        return Task.CompletedTask;
      }, (_, _) =>
      {
        retryWork++;
        return Task.CompletedTask;
      })).ConfigureAwait(false);

    Assert.AreSame(failure, actual);
    Assert.AreEqual(1, calls);
    Assert.AreEqual(1, classifications);
    Assert.AreEqual(0, retryWork);
  }

  /// <summary>Verifies retry support failures escape unchanged instead of consuming another operation attempt.</summary>
  /// <param name="stage">The retry support stage that fails.</param>
  [TestMethod]
  [DataRow("calculation")]
  [DataRow("callback")]
  [DataRow("delay")]
  public async Task ExecuteAsync_RetrySupportFailure_DoesNotRetry(string stage)
  {
    int calls = 0;
    int classifications = 0;
    int callbacks = 0;
    int delays = 0;
    var failure = new IOException("Retry support failed.");
    var policy = new RetryPolicy("retry", 3,
      _ => stage == "calculation" ? throw failure : TimeSpan.Zero,
      (_, _) =>
      {
        classifications++;
        return true;
      });

    IOException actual = await Assert.ThrowsExactlyAsync<IOException>(() =>
      RetryExecutor.ExecuteAsync(policy, _ =>
      {
        calls++;
        return Task.FromException(new InvalidOperationException("Operation failed."));
      }, CancellationToken.None, _ =>
      {
        callbacks++;
        return stage == "callback" ? Task.FromException(failure) : Task.CompletedTask;
      }, (_, _) =>
      {
        delays++;
        return Task.FromException(failure);
      })).ConfigureAwait(false);

    Assert.AreSame(failure, actual);
    Assert.AreEqual(1, calls);
    Assert.AreEqual(1, classifications);
    Assert.AreEqual(stage == "calculation" ? 0 : 1, callbacks);
    Assert.AreEqual(stage == "delay" ? 1 : 0, delays);
  }

  /// <summary>Verifies callbacks complete before delays and subsequent operation attempts begin.</summary>
  [TestMethod]
  public async Task ExecuteAsync_PendingCallback_AwaitsBeforeDelay()
  {
    var callbackCompletion = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    int calls = 0;
    int delays = 0;

    Task execution = RetryExecutor.ExecuteAsync(CreatePolicy(), _ =>
    {
      calls++;
      return calls == 1 ? Task.FromException(new IOException("Retry.")) : Task.CompletedTask;
    }, CancellationToken.None, _ => callbackCompletion.Task, (_, _) =>
    {
      delays++;
      return Task.CompletedTask;
    });

    bool pending = !execution.IsCompleted;
    int callsBeforeCallback = calls;
    int delaysBeforeCallback = delays;
    callbackCompletion.SetResult();
    await execution.ConfigureAwait(false);

    Assert.IsTrue(pending);
    Assert.AreEqual(1, callsBeforeCallback);
    Assert.AreEqual(0, delaysBeforeCallback);
    Assert.AreEqual(2, calls);
    Assert.AreEqual(1, delays);
  }

  /// <summary>Verifies the default delay implementation can complete a zero-duration retry without a callback.</summary>
  [TestMethod]
  public async Task ExecuteAsync_DefaultDelay_CompletesZeroDurationRetry()
  {
    int calls = 0;

    await RetryExecutor.ExecuteAsync(CreatePolicy(), _ =>
    {
      calls++;
      return calls == 1 ? Task.FromException(new IOException("Retry.")) : Task.CompletedTask;
    }, CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(2, calls);
  }

  /// <summary>Verifies overlapping executions of one registered policy each retain the full attempt budget.</summary>
  [TestMethod]
  public async Task ExecuteAsync_ConcurrentReuse_DoesNotShareAttemptBudget()
  {
    var releaseDelays = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    var registry = new RetryPolicyRegistry([CreatePolicy()]);
    var firstFailure = new IOException("First operation.");
    var secondFailure = new IOException("Second operation.");
    int firstCalls = 0;
    int secondCalls = 0;
    int delayCalls = 0;

    Task DelayAsync(TimeSpan _, CancellationToken token)
    {
      Interlocked.Increment(ref delayCalls);
      return releaseDelays.Task;
    }

    Task<IOException> first = Assert.ThrowsExactlyAsync<IOException>(() =>
      RetryExecutor.ExecuteAsync(registry["retry"], _ =>
      {
        firstCalls++;
        return Task.FromException(firstFailure);
      }, CancellationToken.None, delay: DelayAsync));
    Task<IOException> second = Assert.ThrowsExactlyAsync<IOException>(() =>
      RetryExecutor.ExecuteAsync(registry["retry"], _ =>
      {
        secondCalls++;
        return Task.FromException(secondFailure);
      }, CancellationToken.None, delay: DelayAsync));

    bool bothPending = !first.IsCompleted && !second.IsCompleted;
    int firstCallsBeforeRelease = firstCalls;
    int secondCallsBeforeRelease = secondCalls;
    releaseDelays.SetResult();
    IOException[] failures = await Task.WhenAll(first, second).ConfigureAwait(false);

    Assert.IsTrue(bothPending);
    Assert.AreEqual(1, firstCallsBeforeRelease);
    Assert.AreEqual(1, secondCallsBeforeRelease);
    Assert.AreEqual(3, firstCalls);
    Assert.AreEqual(3, secondCalls);
    Assert.AreEqual(4, delayCalls);
    Assert.AreSame(firstFailure, failures[0]);
    Assert.AreSame(secondFailure, failures[1]);
  }

  /// <summary>Verifies execution also validates policies that have not passed through a registry.</summary>
  [TestMethod]
  public async Task ExecuteAsync_InvalidPolicy_RejectsBeforeOperation()
  {
    int calls = 0;
    RetryPolicy policy = CreatePolicy() with { MaxAttempts = 0 };

    await Assert.ThrowsExactlyAsync<ArgumentOutOfRangeException>(() =>
      RetryExecutor.ExecuteAsync(policy, _ =>
      {
        calls++;
        return Task.CompletedTask;
      }, CancellationToken.None)).ConfigureAwait(false);

    Assert.AreEqual(0, calls);
  }

  /// <summary>Verifies required executor arguments cannot be null.</summary>
  [TestMethod]
  public async Task ExecuteAsync_NullPolicyOrOperation_Throws()
  {
    await Assert.ThrowsExactlyAsync<ArgumentNullException>(() =>
      RetryExecutor.ExecuteAsync(null!, static _ => Task.CompletedTask, CancellationToken.None)).ConfigureAwait(false);
    await Assert.ThrowsExactlyAsync<ArgumentNullException>(() =>
      RetryExecutor.ExecuteAsync(CreatePolicy(), null!, CancellationToken.None)).ConfigureAwait(false);
  }

  private static RetryPolicy CreatePolicy(int maxAttempts = 3) =>
    new("retry", maxAttempts, static _ => TimeSpan.Zero, static (_, _) => true);
}
