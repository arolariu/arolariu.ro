namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies retry-policy cancellation branches during scheduled retry delays.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisRetryPolicyCancellationTests
{
  /// <summary>
  /// Verifies cancellation raised by the injected retry delay propagates and prevents later attempts.
  /// </summary>
  [TestMethod]
  public async Task ExecuteAsync_CancellationDuringRetryDelay_ThrowsOperationCanceledException()
  {
    var delays = new List<TimeSpan>();
    using var cancellationTokenSource = new CancellationTokenSource();
    using var cancelledSource = new CancellationTokenSource();
    await cancelledSource.CancelAsync();
    var policy = new GenerativeAnalysisRetryPolicy(
      (duration, cancellationToken) =>
      {
        delays.Add(duration);
        return Task.FromCanceled<string>(cancelledSource.Token);
      },
      () => 0);
    int attempt = 0;
    int observedRetryAttempt = 0;

    await Assert.ThrowsExactlyAsync<TaskCanceledException>(
      () => policy.ExecuteAsync<string>(
        _ =>
        {
          attempt++;
          throw new HttpRequestException("Network unavailable.");
        },
        cancellationTokenSource.Token,
        retryAttempt => observedRetryAttempt = retryAttempt));

    Assert.AreEqual(1, attempt);
    Assert.AreEqual(1, observedRetryAttempt);
    Assert.AreEqual(1, delays.Count);
  }
}
