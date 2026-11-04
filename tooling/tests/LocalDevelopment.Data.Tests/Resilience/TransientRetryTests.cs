namespace LocalDevelopment.Data.Tests.Resilience;

using System.Net;

using global::LocalDevelopment.Data.Resilience;

using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies bounded retries of temporary bootstrap failures.</summary>
[TestClass]
public sealed class TransientRetryTests
{
  private readonly List<TimeSpan> delays = [];
  private readonly StringWriter log = new();

  /// <summary>Verifies temporary failures are retried with doubling waits and one log line per retry.</summary>
  [TestMethod]
  public async Task ExecuteAsync_TransientThenSuccess_RetriesAndLogsEachRetry()
  {
    int calls = 0;

    await CreateRetry().ExecuteAsync(_ =>
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

    await Assert.ThrowsExactlyAsync<CosmosException>(() => CreateRetry().ExecuteAsync(_ =>
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

    await Assert.ThrowsExactlyAsync<CosmosException>(() => CreateRetry().ExecuteAsync(_ =>
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
    var retry = new TransientRetry(5, TimeSpan.FromSeconds(1), (_, token) =>
    {
      source.Cancel();
      throw new OperationCanceledException(token);
    }, log);

    await Assert.ThrowsAsync<OperationCanceledException>(() => retry.ExecuteAsync(_ =>
    {
      calls++;
      return Task.FromException(Cosmos(503));
    }, source.Token));

    Assert.AreEqual(1, calls);
  }

  private TransientRetry CreateRetry() =>
    new(5, TimeSpan.FromSeconds(1), (delay, _) =>
    {
      delays.Add(delay);
      return Task.CompletedTask;
    }, log);

  private static CosmosException Cosmos(int status) => new("test", (HttpStatusCode)status, 0, "activity", 0);
}
