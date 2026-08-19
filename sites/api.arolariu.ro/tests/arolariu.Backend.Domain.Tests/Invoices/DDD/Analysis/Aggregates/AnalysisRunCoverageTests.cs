namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Aggregates;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests coverage-sensitive analysis run claim and lease renewal branches.
/// </summary>
[TestClass]
public sealed class AnalysisRunCoverageTests
{
  /// <summary>
  /// Verifies that claiming an already-running run without a lease expiry is rejected.
  /// </summary>
  [TestMethod]
  public void Claim_RunningRunWithoutLeaseExpiry_ThrowsInvalidAnalysisRunTransitionException()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ActiveRunning() with { LeaseExpiresAt = null };

    Assert.ThrowsExactly<InvalidAnalysisRunTransitionException>(() =>
      run.Claim("worker-b", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5)));
  }

  /// <summary>
  /// Verifies that claiming a terminal completed run is rejected as non-claimable.
  /// </summary>
  [TestMethod]
  public void Claim_CompletedRun_ThrowsInvalidAnalysisRunTransitionException()
  {
    AnalysisRun run = AnalysisRunTestBuilder.Terminal(AnalysisRunStatus.Completed);

    Assert.ThrowsExactly<InvalidAnalysisRunTransitionException>(() =>
      run.Claim("worker-b", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5)));
  }

  /// <summary>
  /// Verifies that claiming a running run with an expired lease succeeds and keeps the first started timestamp.
  /// </summary>
  [TestMethod]
  public void Claim_ExpiredLease_ReassignsOwnerAndPreservesStartedAt()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ExpiredRunning();
    DateTimeOffset? startedAt = run.StartedAt;
    DateTimeOffset now = DateTimeOffset.UtcNow;

    AnalysisRun claimed = run.Claim("worker-b", now, TimeSpan.FromMinutes(10));

    Assert.AreEqual(AnalysisRunStatus.Running, claimed.Status);
    Assert.AreEqual("worker-b", claimed.LeaseOwner);
    Assert.AreEqual(startedAt, claimed.StartedAt);
    Assert.AreEqual(now + TimeSpan.FromMinutes(10), claimed.LeaseExpiresAt);
    Assert.AreEqual(run.AttemptCount + 1, claimed.AttemptCount);
  }

  /// <summary>
  /// Verifies that claim validates lease owner and lease duration before transition logic.
  /// </summary>
  [TestMethod]
  public void Claim_InvalidLeaseInputs_ThrowExpectedExceptions()
  {
    AnalysisRun run = AnalysisRunTestBuilder.Queued();

    Assert.ThrowsExactly<ArgumentException>(() => run.Claim(" ", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5)));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => run.Claim("worker-a", DateTimeOffset.UtcNow, TimeSpan.Zero));
  }

  /// <summary>
  /// Verifies that renewing a lease after the run was terminally lost is rejected.
  /// </summary>
  [TestMethod]
  public void RenewLease_FailedRun_ThrowsInvalidAnalysisRunTransitionException()
  {
    AnalysisRun run = AnalysisRunTestBuilder.Terminal(AnalysisRunStatus.Failed);

    Assert.ThrowsExactly<InvalidAnalysisRunTransitionException>(() =>
      run.RenewLease(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5)));
  }

  /// <summary>
  /// Verifies that lease renewal rejects non-positive durations.
  /// </summary>
  [TestMethod]
  public void RenewLease_NonPositiveLeaseDuration_ThrowsArgumentOutOfRangeException()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ActiveRunning();

    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      run.RenewLease(DateTimeOffset.UtcNow, TimeSpan.Zero));
  }

  /// <summary>
  /// Verifies that a run requesting neither invoice nor merchant capabilities resolves to a success outcome
  /// regardless of what completed, since a request for nothing cannot have any failed work.
  /// </summary>
  [TestMethod]
  public void ResolveOutcome_NoRequestedCapabilities_ReturnsSuccess()
  {
    AnalysisRun run = new()
    {
      Id = Guid.NewGuid(),
      TargetType = AnalysisTargetType.Merchant,
      TargetId = Guid.NewGuid(),
      RequestedBy = Guid.NewGuid(),
      Status = AnalysisRunStatus.Running,
      AcceptedAt = DateTimeOffset.UtcNow,
    };

    AnalysisOutcome outcome = run.ResolveOutcome([]);

    Assert.AreEqual(AnalysisOutcome.Success, outcome);
  }

  /// <summary>
  /// Verifies record cloning and string formatting for analysis runs.
  /// </summary>
  [TestMethod]
  public void AnalysisRun_WithExpressionAndToString_ExercisesRecordMembers()
  {
    AnalysisRun run = AnalysisRunTestBuilder.Queued();
    AnalysisRun copy = run with { };
    AnalysisRun? missing = null;

    Assert.IsTrue(run.Equals(copy));
    Assert.IsFalse(run.Equals(missing));
    StringAssert.Contains(run.ToString(), nameof(AnalysisRun.TargetType), StringComparison.Ordinal);
  }
}
