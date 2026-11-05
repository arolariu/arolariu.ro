namespace LocalDevelopment.Data.Tests;

using System.Net;

using Azure;
using global::LocalDevelopment.Common.Http.Resilience;
using global::LocalDevelopment.Data;
using global::LocalDevelopment.Data.Scenarios.Invoices;

using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies bounded retries of temporary bootstrap failures.</summary>
[TestClass]
public sealed class LocalDataRetryPoliciesTests
{
  private readonly List<TimeSpan> delays = [];
  private readonly StringWriter log = new();

  /// <summary>Verifies temporary failures are retried with doubling waits and one log line per retry.</summary>
  [TestMethod]
  public async Task ExecuteAsync_TransientThenSuccess_RetriesAndLogsEachRetry()
  {
    int calls = 0;

    await ExecuteScenarioAsync(_ =>
    {
      calls++;
      return calls <= 2 ? Task.FromException(Cosmos(503)) : Task.CompletedTask;
    }, CancellationToken.None);

    Assert.AreEqual(3, calls);
    CollectionAssert.AreEqual(new[] { TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2) }, delays);
    string[] lines = log.ToString().Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
    Assert.HasCount(2, lines);
    StringAssert.Contains(lines[0], "attempt 1/5");
  }

  /// <summary>Verifies a permanent failure surfaces at once without waiting or logging a retry.</summary>
  [TestMethod]
  public async Task ExecuteAsync_PermanentFailure_ThrowsImmediately()
  {
    int calls = 0;

    await Assert.ThrowsExactlyAsync<CosmosException>(() => ExecuteScenarioAsync(_ =>
    {
      calls++;
      return Task.FromException(Cosmos(500));
    }, CancellationToken.None));

    Assert.AreEqual(1, calls);
    Assert.HasCount(0, delays);
    Assert.AreEqual(string.Empty, log.ToString());
  }

  /// <summary>Verifies retries stop after the attempt budget and the last failure surfaces.</summary>
  [TestMethod]
  public async Task ExecuteAsync_TransientUntilExhausted_ThrowsLastFailure()
  {
    int calls = 0;

    await Assert.ThrowsExactlyAsync<CosmosException>(() => ExecuteScenarioAsync(_ =>
    {
      calls++;
      return Task.FromException(Cosmos(503));
    }, CancellationToken.None));

    Assert.AreEqual(5, calls);
    CollectionAssert.AreEqual(
      new[] { TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(4), TimeSpan.FromSeconds(8) },
      delays);
  }

  /// <summary>Verifies cancellation during a backoff wait stops without another attempt.</summary>
  [TestMethod]
  public async Task ExecuteAsync_CancelledDuringBackoff_StopsWithoutAnotherAttempt()
  {
    using var source = new CancellationTokenSource();
    int calls = 0;
    Task Delay(TimeSpan _, CancellationToken token)
    {
      source.Cancel();
      throw new OperationCanceledException(token);
    }

    await Assert.ThrowsAsync<OperationCanceledException>(() => ExecuteScenarioAsync(_ =>
    {
      calls++;
      return Task.FromException(Cosmos(503));
    }, source.Token, Delay));

    Assert.AreEqual(1, calls);
  }

  /// <summary>Both deletion-in-progress codes retain thirty attempts and fixed one-second waits.</summary>
  [TestMethod]
  [DataRow("ContainerBeingDeleted")]
  [DataRow("QueueBeingDeleted")]
  public async Task ExecuteAsync_DeletionPending_UsesThirtyAttemptsAndPreservesFailure(string code)
  {
    var failure = new RequestFailedException(409, "pending", code, null);
    int calls = 0;
    RequestFailedException thrown = await Assert.ThrowsExactlyAsync<RequestFailedException>(() =>
      RetryExecutor.ExecuteAsync(LocalDataRetryPolicies.Default[LocalDataRetryPolicies.StorageDeletionPending], _ =>
      {
        calls++;
        return Task.FromException(failure);
      }, CancellationToken.None, delay: RecordDelayAsync));

    Assert.AreSame(failure, thrown);
    Assert.AreEqual(30, calls);
    CollectionAssert.AreEqual(Enumerable.Repeat(TimeSpan.FromSeconds(1), 29).ToArray(), delays);
  }

  /// <summary>Unrelated conflicts and non-conflict failures cannot enter post-deletion retries.</summary>
  [TestMethod]
  [DataRow(409, "AlreadyExists")]
  [DataRow(503, "ContainerBeingDeleted")]
  [DataRow(404, "QueueBeingDeleted")]
  public async Task ExecuteAsync_OtherStorageFailure_DoesNotRetry(int status, string code)
  {
    var failure = new RequestFailedException(status, "test", code, null);
    int calls = 0;
    RequestFailedException thrown = await Assert.ThrowsExactlyAsync<RequestFailedException>(() =>
      RetryExecutor.ExecuteAsync(LocalDataRetryPolicies.Default[LocalDataRetryPolicies.StorageDeletionPending], _ =>
      {
        calls++;
        return Task.FromException(failure);
      }, CancellationToken.None, delay: RecordDelayAsync));

    Assert.AreSame(failure, thrown);
    Assert.AreEqual(1, calls);
    Assert.HasCount(0, delays);
  }

  /// <summary>Retry diagnostics include the status but never the SDK's potentially sensitive message.</summary>
  [TestMethod]
  public async Task ExecuteAsync_ProviderFailure_LogsSanitizedStatus()
  {
    int calls = 0;
    await ExecuteScenarioAsync(_ => ++calls == 1
      ? Task.FromException(new RequestFailedException(503, "private endpoint details"))
      : Task.CompletedTask, CancellationToken.None);

    Assert.AreEqual(
      $"Local development bootstrap attempt 1/5 failed with RequestFailedException 503; retrying in 1 s.{Environment.NewLine}",
      log.ToString());
  }

  private Task ExecuteScenarioAsync(
    Func<CancellationToken, Task> operation, CancellationToken token,
    Func<TimeSpan, CancellationToken, Task>? delay = null) =>
    RetryExecutor.ExecuteAsync(LocalDataRetryPolicies.Default[LocalDataRetryPolicies.ScenarioTransient],
      operation, token, context => LocalScenarioBootstrap.LogRetryAsync(log, context), delay ?? RecordDelayAsync);

  private Task RecordDelayAsync(TimeSpan delay, CancellationToken _)
  {
    delays.Add(delay);
    return Task.CompletedTask;
  }

  private static CosmosException Cosmos(int status) => new("test", (HttpStatusCode)status, 0, "activity", 0);
}
