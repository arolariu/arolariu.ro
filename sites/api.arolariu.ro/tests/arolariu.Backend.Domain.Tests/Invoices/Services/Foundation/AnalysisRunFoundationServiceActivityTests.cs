namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies <see cref="AnalysisRunFoundationService.ClaimNextRunAsync"/> activity tags record expected values when
/// an invoice <see cref="ActivityListener"/> is present, covering the non-null <c>activity?.SetTag(...)</c> arms
/// that a listener-less broker mock cannot otherwise reach.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisRunFoundationServiceActivityTests
{
  /// <summary>
  /// Verifies a successful claim records the inspected-candidate count and a claimed=true tag.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_RecorderActive_ClaimableRunExists_RecordsClaimedTags()
  {
    AnalysisRun candidate = AnalysisRunTestBuilder.Queued();
    var broker = new Mock<IAnalysisRunBroker>();
    broker
      .Setup(b => b.StreamClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(Candidates(candidate));
    broker
      .Setup(b => b.ReplaceAsync(It.IsAny<AnalysisRun>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Returns((AnalysisRun run, string _, CancellationToken _) => new ValueTask<AnalysisRun>(run));
    var service = new AnalysisRunFoundationService(broker.Object, NullLoggerFactory.Instance);
    using var recorder = new InvoiceActivityRecorder();

    AnalysisRun? result = await service
      .ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)
      .ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(AnalysisRunFoundationService.ClaimNextRunAsync));
    Assert.IsNotNull(result);
    Assert.AreEqual("1", InvoiceActivityRecorder.TagValue(activity, "analysis.claim.candidates_inspected"));
    Assert.AreEqual("True", InvoiceActivityRecorder.TagValue(activity, "analysis.claim.claimed"));
  }

  /// <summary>
  /// Verifies an exhausted claim scan records the inspected-candidate count and a claimed=false tag.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_RecorderActive_NoClaimableRun_RecordsNotClaimedTags()
  {
    var broker = new Mock<IAnalysisRunBroker>();
    broker
      .Setup(b => b.StreamClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(EmptyCandidates());
    var service = new AnalysisRunFoundationService(broker.Object, NullLoggerFactory.Instance);
    using var recorder = new InvoiceActivityRecorder();

    AnalysisRun? result = await service
      .ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)
      .ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(AnalysisRunFoundationService.ClaimNextRunAsync));
    Assert.IsNull(result);
    Assert.AreEqual("0", InvoiceActivityRecorder.TagValue(activity, "analysis.claim.candidates_inspected"));
    Assert.AreEqual("False", InvoiceActivityRecorder.TagValue(activity, "analysis.claim.claimed"));
  }

  /// <summary>Produces an empty claim-candidate stream.</summary>
  private static async IAsyncEnumerable<AnalysisRun> EmptyCandidates()
  {
    await Task.CompletedTask.ConfigureAwait(false);
    yield break;
  }

  /// <summary>Produces a claim-candidate stream over the supplied runs.</summary>
  /// <param name="runs">The candidates to stream, in scan order.</param>
  private static async IAsyncEnumerable<AnalysisRun> Candidates(params AnalysisRun[] runs)
  {
    foreach (AnalysisRun run in runs)
    {
      await Task.Yield();
      yield return run;
    }
  }

  private static Activity RequireActivity(InvoiceActivityRecorder recorder, string operationName)
  {
    Activity? activity = recorder.FindActivity(operationName);

    if (activity is not null)
    {
      return activity;
    }

    throw new AssertFailedException($"Activity '{operationName}' was not recorded.");
  }
}
