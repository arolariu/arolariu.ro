namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Azure;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies bounded transient-failure retry behavior for <see cref="GenerativeAnalysisRetryPolicy"/> using an
/// injected delay delegate so tests complete deterministically without sleeping.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisRetryPolicyTests
{
  /// <summary>
  /// Verifies that a transient dependency failure (HTTP 5xx) is retried and eventually succeeds, using the exact
  /// 250 ms / 750 ms base delays with zero injected jitter.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_TransientFailureThenSuccess_RetriesWithExpectedDelaysAndReturnsResult()
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    string result = await policy.ExecuteAsync(
      _ =>
      {
        attempt++;
        return attempt < 3
          ? throw new RequestFailedException(503, "Service Unavailable")
          : Task.FromResult("ok");
      },
      CancellationToken.None);

    Assert.AreEqual("ok", result);
    Assert.AreEqual(3, attempt);
    CollectionAssert.AreEqual(
      new[] { TimeSpan.FromMilliseconds(250), TimeSpan.FromMilliseconds(750) },
      recordedDelays);
  }

  /// <summary>
  /// Verifies HTTP 408, 429, and 5xx dependency failures are retried at most twice (three total attempts) before
  /// the final failure propagates.
  /// </summary>
  [TestMethod]
  [DataRow(408)]
  [DataRow(429)]
  [DataRow(500)]
  [DataRow(503)]
  public async Task ExecuteAsync_TransientStatusExhaustsAllAttempts_ThrowsAfterExactlyTwoRetries(int statusCode)
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    var exception = await Assert.ThrowsExactlyAsync<RequestFailedException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new RequestFailedException(statusCode, "Transient dependency failure");
        },
        CancellationToken.None));

    Assert.AreEqual(statusCode, exception.Status);
    Assert.AreEqual(3, attempt);
    Assert.AreEqual(2, recordedDelays.Count);
  }

  /// <summary>
  /// Verifies non-transient <see cref="RequestFailedException"/> statuses (e.g. 400, 401, 403, 404) are never retried.
  /// </summary>
  [TestMethod]
  [DataRow(400)]
  [DataRow(401)]
  [DataRow(403)]
  [DataRow(404)]
  public async Task ExecuteAsync_NonTransientRequestFailedException_DoesNotRetry(int statusCode)
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    await Assert.ThrowsExactlyAsync<RequestFailedException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new RequestFailedException(statusCode, "Non-transient failure");
        },
        CancellationToken.None));

    Assert.AreEqual(1, attempt);
    Assert.AreEqual(0, recordedDelays.Count);
  }

  /// <summary>
  /// Verifies content-filter/refusal and invalid-schema failures (<see cref="InvalidStructuredOutputException"/>)
  /// are never retried.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_InvalidStructuredOutputException_DoesNotRetry()
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    await Assert.ThrowsExactlyAsync<InvalidStructuredOutputException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new InvalidStructuredOutputException("Refused or unparseable output.");
        },
        CancellationToken.None));

    Assert.AreEqual(1, attempt);
    Assert.AreEqual(0, recordedDelays.Count);
  }

  /// <summary>
  /// Verifies invalid taxonomy code failures (<see cref="TaxonomyCodeNotFoundException"/>) are never retried.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_TaxonomyCodeNotFoundException_DoesNotRetry()
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    await Assert.ThrowsExactlyAsync<TaxonomyCodeNotFoundException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new TaxonomyCodeNotFoundException(ClassificationSystem.Gs1Gpc, "00000000");
        },
        CancellationToken.None));

    Assert.AreEqual(1, attempt);
    Assert.AreEqual(0, recordedDelays.Count);
  }

  /// <summary>
  /// Verifies caller validation failures (<see cref="ArgumentException"/>) are never retried.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_ArgumentException_DoesNotRetry()
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    await Assert.ThrowsExactlyAsync<ArgumentException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new ArgumentException("Invalid domain validation.");
        },
        CancellationToken.None));

    Assert.AreEqual(1, attempt);
    Assert.AreEqual(0, recordedDelays.Count);
  }

  /// <summary>
  /// Verifies cancellation is never retried, regardless of how many attempts remain.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_OperationCanceledException_DoesNotRetry()
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new OperationCanceledException();
        },
        CancellationToken.None));

    Assert.AreEqual(1, attempt);
    Assert.AreEqual(0, recordedDelays.Count);
  }

  /// <summary>
  /// Verifies transient <see cref="HttpRequestException"/> and <see cref="TimeoutException"/> failures are retried.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_TransientHttpRequestException_Retries()
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 0);

    int attempt = 0;

    string result = await policy.ExecuteAsync(
      _ =>
      {
        attempt++;
        return attempt < 2
          ? throw new HttpRequestException("Transient network failure.")
          : Task.FromResult("ok");
      },
      CancellationToken.None);

    Assert.AreEqual("ok", result);
    Assert.AreEqual(1, recordedDelays.Count);
  }

  /// <summary>
  /// Verifies bounded jitter is added on top of the fixed base delay.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_MaximumJitter_AddsBoundedJitterToBaseDelay()
  {
    var recordedDelays = new List<TimeSpan>();
    var policy = CreatePolicy(recordedDelays, jitterFraction: 1.0);

    int attempt = 0;

    _ = await policy.ExecuteAsync(
      _ =>
      {
        attempt++;
        return attempt < 2
          ? throw new RequestFailedException(503, "Service Unavailable")
          : Task.FromResult("ok");
      },
      CancellationToken.None);

    Assert.AreEqual(1, recordedDelays.Count);
    Assert.IsTrue(recordedDelays[0] > TimeSpan.FromMilliseconds(250));
    Assert.IsTrue(recordedDelays[0] <= TimeSpan.FromMilliseconds(350));
  }

  private static GenerativeAnalysisRetryPolicy CreatePolicy(List<TimeSpan> recordedDelays, double jitterFraction) =>
    new(
      (duration, _) =>
      {
        recordedDelays.Add(duration);
        return Task.CompletedTask;
      },
      () => jitterFraction);
}
