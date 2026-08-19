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
/// Verifies retry-policy branch behavior not covered by the main retry-policy tests.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisRetryPolicyBranchTests
{
  /// <summary>
  /// Verifies that retries still occur when no retry observer is supplied.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_NullRetryObserver_RetriesAndReturnsResult()
  {
    var delays = new List<TimeSpan>();
    var policy = CreatePolicy(delays, jitterFraction: 0);
    int attempt = 0;

    string result = await policy.ExecuteAsync(
      _ =>
      {
        attempt++;
        return attempt == 1
          ? throw new TimeoutException("Transient timeout.")
          : Task.FromResult("ok");
      },
      CancellationToken.None,
      onRetryScheduled: null);

    Assert.AreEqual("ok", result);
    Assert.AreEqual(2, attempt);
    Assert.AreEqual(1, delays.Count);
  }

  /// <summary>
  /// Verifies that an already-canceled token prevents retry scheduling even for transient dependency failures.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_CancellationAlreadyRequested_DoesNotRetryTransientFailure()
  {
    var delays = new List<TimeSpan>();
    var policy = CreatePolicy(delays, jitterFraction: 0);
    using var cts = new CancellationTokenSource();
    await cts.CancelAsync();
    int attempt = 0;

    await Assert.ThrowsExactlyAsync<HttpRequestException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new HttpRequestException("Network unavailable.");
        },
        cts.Token));

    Assert.AreEqual(1, attempt);
    Assert.AreEqual(0, delays.Count);
  }

  /// <summary>
  /// Verifies that non-transient exception types are explicitly excluded from retry eligibility.
  /// </summary>
  [TestMethod]
  public void IsTransientDependencyFailure_NonTransientExceptionTypes_ReturnsFalse()
  {
    Assert.IsFalse(GenerativeAnalysisRetryPolicy.IsTransientDependencyFailure(new ArgumentException("Invalid.")));
    Assert.IsFalse(GenerativeAnalysisRetryPolicy.IsTransientDependencyFailure(
      new TaxonomyCodeNotFoundException(ClassificationSystem.Gs1Gpc, "00000000")));
    Assert.IsFalse(GenerativeAnalysisRetryPolicy.IsTransientDependencyFailure(new RequestFailedException(418, "Teapot.")));
  }

  /// <summary>
  /// Verifies that transient Azure request failure statuses are eligible for retry.
  /// </summary>
  [TestMethod]
  [DataRow(408)]
  [DataRow(429)]
  [DataRow(500)]
  [DataRow(599)]
  public void IsTransientDependencyFailure_TransientRequestFailedStatus_ReturnsTrue(int statusCode) =>
    Assert.IsTrue(GenerativeAnalysisRetryPolicy.IsTransientDependencyFailure(
      new RequestFailedException(statusCode, "Transient failure.")));

  /// <summary>
  /// Verifies that negative jitter fractions clamp to zero jitter.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_JitterBelowZero_ClampsToMinimumDelay()
  {
    var delays = new List<TimeSpan>();
    var policy = CreatePolicy(delays, jitterFraction: -2.0);

    _ = await RetryOnceAsync(policy);

    Assert.AreEqual(TimeSpan.FromMilliseconds(250), delays[0]);
  }

  /// <summary>
  /// Verifies that jitter fractions above one clamp to the maximum jitter.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_JitterAboveOne_ClampsToMaximumDelay()
  {
    var delays = new List<TimeSpan>();
    var policy = CreatePolicy(delays, jitterFraction: 2.0);

    _ = await RetryOnceAsync(policy);

    Assert.AreEqual(TimeSpan.FromMilliseconds(350), delays[0]);
  }

  private static async Task<string> RetryOnceAsync(GenerativeAnalysisRetryPolicy policy)
  {
    int attempt = 0;

    return await policy.ExecuteAsync(
      _ =>
      {
        attempt++;
        return attempt == 1
          ? throw new RequestFailedException(503, "Service unavailable.")
          : Task.FromResult("ok");
      },
      CancellationToken.None);
  }

  private static GenerativeAnalysisRetryPolicy CreatePolicy(List<TimeSpan> delays, double jitterFraction) =>
    new(
      (duration, _) =>
      {
        delays.Add(duration);
        return Task.CompletedTask;
      },
      () => jitterFraction);
}
