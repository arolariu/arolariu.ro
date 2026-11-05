namespace LocalDevelopment.Common.Tests.Http.Resilience;

using global::LocalDevelopment.Common.Http.Resilience;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies caller-selected cancellation semantics without timed waits.</summary>
[TestClass]
public sealed class RetryExecutorCancellationTests
{
  /// <summary>Verifies the same caller token reaches all operation attempts, classification, and delay.</summary>
  [TestMethod]
  public async Task ExecuteAsync_CallerToken_ForwardsUnchanged()
  {
    using var source = new CancellationTokenSource();
    var operationTokens = new List<CancellationToken>();
    CancellationToken classifierToken = default;
    CancellationToken delayToken = default;
    var failure = new IOException("Retry.");
    Exception? classifiedFailure = null;
    RetryPolicy policy = CreatePolicy() with
    {
      ShouldRetry = (exception, token) =>
      {
        classifiedFailure = exception;
        classifierToken = token;
        return true;
      },
    };

    await RetryExecutor.ExecuteAsync(policy, token =>
    {
      operationTokens.Add(token);
      return operationTokens.Count == 1 ? Task.FromException(failure) : Task.CompletedTask;
    }, source.Token, delay: (_, token) =>
    {
      delayToken = token;
      return Task.CompletedTask;
    }).ConfigureAwait(false);

    CollectionAssert.AreEqual(new[] { source.Token, source.Token }, operationTokens);
    Assert.AreEqual(source.Token, classifierToken);
    Assert.AreEqual(source.Token, delayToken);
    Assert.AreSame(failure, classifiedFailure);
  }

  /// <summary>Verifies default policies leave cancellation observation to the operation and retry delegates.</summary>
  [TestMethod]
  public async Task ExecuteAsync_DefaultChecks_CanSucceedWithCanceledCallerToken()
  {
    using var source = new CancellationTokenSource();
    source.Cancel();
    int calls = 0;
    CancellationToken operationToken = default;

    await RetryExecutor.ExecuteAsync(CreatePolicy(), token =>
    {
      calls++;
      operationToken = token;
      return Task.CompletedTask;
    }, source.Token).ConfigureAwait(false);

    Assert.AreEqual(1, calls);
    Assert.AreEqual(source.Token, operationToken);
  }

  /// <summary>Verifies an enabled pre-check rejects caller cancellation without invoking or classifying the operation.</summary>
  [TestMethod]
  public async Task ExecuteAsync_PreCanceledWithPreCheck_DoesNotAttempt()
  {
    using var source = new CancellationTokenSource();
    source.Cancel();
    int calls = 0;
    int classifications = 0;
    RetryPolicy policy = CreatePolicy() with
    {
      CheckCancellationBeforeAttempt = true,
      ShouldRetry = (_, _) =>
      {
        classifications++;
        return true;
      },
    };

    OperationCanceledException actual = await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      RetryExecutor.ExecuteAsync(policy, _ =>
      {
        calls++;
        return Task.CompletedTask;
      }, source.Token)).ConfigureAwait(false);

    Assert.AreEqual(source.Token, actual.CancellationToken);
    Assert.AreEqual(0, calls);
    Assert.AreEqual(0, classifications);
  }

  /// <summary>Verifies only the optional post-check rejects cancellation observed after operation success.</summary>
  /// <param name="checkAfter">Whether to check cancellation after the operation succeeds.</param>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public async Task ExecuteAsync_CanceledDuringSuccessfulAttempt_UsesPostCheckSetting(bool checkAfter)
  {
    using var source = new CancellationTokenSource();
    int calls = 0;
    int classifications = 0;
    RetryPolicy policy = CreatePolicy() with
    {
      CheckCancellationBeforeAttempt = true,
      CheckCancellationAfterAttempt = checkAfter,
      ShouldRetry = (_, _) =>
      {
        classifications++;
        return true;
      },
    };

    Task execution = RetryExecutor.ExecuteAsync(policy, _ =>
    {
      calls++;
      source.Cancel();
      return Task.CompletedTask;
    }, source.Token);

    if (checkAfter)
    {
      OperationCanceledException actual =
        await Assert.ThrowsExactlyAsync<OperationCanceledException>(() => execution).ConfigureAwait(false);
      Assert.AreEqual(source.Token, actual.CancellationToken);
    }
    else
    {
      await execution.ConfigureAwait(false);
    }

    Assert.AreEqual(1, calls);
    Assert.AreEqual(0, classifications);
  }

  /// <summary>Verifies the pre-check also guards later attempts when a custom delay ignores cancellation.</summary>
  [TestMethod]
  public async Task ExecuteAsync_CanceledBetweenAttempts_PreCheckStopsNextAttempt()
  {
    using var source = new CancellationTokenSource();
    int calls = 0;
    int classifications = 0;
    int delays = 0;
    RetryPolicy policy = CreatePolicy() with
    {
      CheckCancellationBeforeAttempt = true,
      ShouldRetry = (_, _) =>
      {
        classifications++;
        return true;
      },
    };

    OperationCanceledException actual = await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      RetryExecutor.ExecuteAsync(policy, _ =>
      {
        calls++;
        return Task.FromException(new IOException("Retry."));
      }, source.Token, delay: (_, _) =>
      {
        delays++;
        source.Cancel();
        return Task.CompletedTask;
      })).ConfigureAwait(false);

    Assert.AreEqual(source.Token, actual.CancellationToken);
    Assert.AreEqual(1, calls);
    Assert.AreEqual(1, classifications);
    Assert.AreEqual(1, delays);
  }

  /// <summary>Verifies cancellation of a pending delay stops execution without another attempt or classification.</summary>
  [TestMethod]
  public async Task ExecuteAsync_CallerCancelsDuringDelay_Stops()
  {
    using var source = new CancellationTokenSource();
    var delayCompletion = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    using CancellationTokenRegistration registration =
      source.Token.Register(() => delayCompletion.TrySetCanceled(source.Token));
    int calls = 0;
    int classifications = 0;
    int delays = 0;
    RetryPolicy policy = CreatePolicy() with
    {
      ShouldRetry = (_, _) =>
      {
        classifications++;
        return true;
      },
    };

    Task execution = RetryExecutor.ExecuteAsync(policy, _ =>
    {
      calls++;
      return Task.FromException(new IOException("Retry."));
    }, source.Token, delay: (_, _) =>
    {
      delays++;
      return delayCompletion.Task;
    });

    bool pending = !execution.IsCompleted;
    source.Cancel();
    TaskCanceledException actual = await Assert.ThrowsExactlyAsync<TaskCanceledException>(() => execution).ConfigureAwait(false);

    Assert.IsTrue(pending);
    Assert.AreEqual(source.Token, actual.CancellationToken);
    Assert.AreEqual(1, calls);
    Assert.AreEqual(1, classifications);
    Assert.AreEqual(1, delays);
  }

  /// <summary>Verifies the default delay observes caller cancellation even when policy classification allows retry.</summary>
  [TestMethod]
  public async Task ExecuteAsync_DefaultDelayWithCanceledToken_Stops()
  {
    using var source = new CancellationTokenSource();
    int calls = 0;

    TaskCanceledException actual = await Assert.ThrowsExactlyAsync<TaskCanceledException>(() =>
      RetryExecutor.ExecuteAsync(CreatePolicy(), _ =>
      {
        calls++;
        source.Cancel();
        return Task.FromException(new IOException("Retry."));
      }, source.Token)).ConfigureAwait(false);

    Assert.AreEqual(source.Token, actual.CancellationToken);
    Assert.AreEqual(1, calls);
  }

  /// <summary>Verifies timeout retries and caller cancellation are controlled by the supplied predicate.</summary>
  /// <param name="callerCanceled">Whether the caller token is already canceled.</param>
  /// <param name="retryTimeouts">Whether this policy permits retrying operation timeouts.</param>
  [TestMethod]
  [DataRow(false, true)]
  [DataRow(true, true)]
  [DataRow(false, false)]
  public async Task ExecuteAsync_TimeoutOrCallerCancellation_UsesPredicate(bool callerCanceled, bool retryTimeouts)
  {
    using var source = new CancellationTokenSource();
    if (callerCanceled)
    {
      source.Cancel();
    }

    int calls = 0;
    int delays = 0;
    var failure = new TaskCanceledException("Operation timeout or cancellation.");
    RetryPolicy policy = CreatePolicy() with
    {
      ShouldRetry = (exception, token) => retryTimeouts && HttpFailureClassifier.IsTransient(exception, token),
    };

    Task execution = RetryExecutor.ExecuteAsync(policy, _ =>
    {
      calls++;
      return calls == 1 ? Task.FromException(failure) : Task.CompletedTask;
    }, source.Token, delay: (_, _) =>
    {
      delays++;
      return Task.CompletedTask;
    });

    if (callerCanceled || !retryTimeouts)
    {
      TaskCanceledException actual = await Assert.ThrowsExactlyAsync<TaskCanceledException>(() => execution).ConfigureAwait(false);
      Assert.AreSame(failure, actual);
      Assert.AreEqual(1, calls);
      Assert.AreEqual(0, delays);
    }
    else
    {
      await execution.ConfigureAwait(false);
      Assert.AreEqual(2, calls);
      Assert.AreEqual(1, delays);
    }
  }

  private static RetryPolicy CreatePolicy() =>
    new("retry", 3, static _ => TimeSpan.Zero, static (_, _) => true);
}
