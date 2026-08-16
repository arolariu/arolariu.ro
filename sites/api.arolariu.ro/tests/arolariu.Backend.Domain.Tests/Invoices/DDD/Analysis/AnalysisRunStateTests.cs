namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines state-machine invariant tests for the <see cref="AnalysisRun"/> aggregate.
/// </summary>
[TestClass]
public sealed class AnalysisRunStateTests
{
  /// <summary>
  /// Verifies that completing a run that has never been claimed is rejected.
  /// </summary>
  [TestMethod]
  public void Complete_FromQueued_ThrowsInvalidAnalysisRunTransitionException()
  {
    AnalysisRun run = AnalysisRun.CreateInvoice(
      Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), InvoiceAnalysisOptions.Comprehensive(), "trace");

    Assert.ThrowsExactly<InvalidAnalysisRunTransitionException>(() =>
      run.Complete(DateTimeOffset.UtcNow, []));
  }

  /// <summary>
  /// Verifies that claiming a run whose lease has expired reassigns the lease and increments the attempt count.
  /// </summary>
  [TestMethod]
  public void Claim_ExpiredRunningRun_ReassignsLeaseAndIncrementsAttempt()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ExpiredRunning();
    AnalysisRun claimed = run.Claim("worker-b", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(2));

    Assert.AreEqual("worker-b", claimed.LeaseOwner);
    Assert.AreEqual(run.AttemptCount + 1, claimed.AttemptCount);
  }

  /// <summary>
  /// Verifies that claiming a freshly queued run transitions it to running and sets the started timestamp.
  /// </summary>
  [TestMethod]
  public void Claim_QueuedRun_TransitionsToRunningAndSetsStartedAt()
  {
    DateTimeOffset now = DateTimeOffset.UtcNow;
    AnalysisRun run = AnalysisRunTestBuilder.Queued();

    AnalysisRun claimed = run.Claim("worker-a", now, TimeSpan.FromMinutes(5));

    Assert.AreEqual(AnalysisRunStatus.Running, claimed.Status);
    Assert.AreEqual("worker-a", claimed.LeaseOwner);
    Assert.AreEqual(now, claimed.StartedAt);
    Assert.AreEqual(now + TimeSpan.FromMinutes(5), claimed.LeaseExpiresAt);
    Assert.AreEqual(1, claimed.AttemptCount);
  }

  /// <summary>
  /// Verifies that claiming a run whose lease is still active is rejected.
  /// </summary>
  [TestMethod]
  public void Claim_ActiveRunningRun_ThrowsInvalidAnalysisRunTransitionException()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ActiveRunning();

    Assert.ThrowsExactly<InvalidAnalysisRunTransitionException>(() =>
      run.Claim("worker-b", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(2)));
  }

  /// <summary>
  /// Verifies that renewing the lease of a running run extends its expiry without altering other state.
  /// </summary>
  [TestMethod]
  public void RenewLease_RunningRun_ExtendsLeaseExpiry()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ActiveRunning();
    DateTimeOffset now = DateTimeOffset.UtcNow;

    AnalysisRun renewed = run.RenewLease(now, TimeSpan.FromMinutes(10));

    Assert.AreEqual(now + TimeSpan.FromMinutes(10), renewed.LeaseExpiresAt);
    Assert.AreEqual(run.LeaseOwner, renewed.LeaseOwner);
    Assert.AreEqual(AnalysisRunStatus.Running, renewed.Status);
  }

  /// <summary>
  /// Verifies that renewing the lease of a queued (never-claimed) run is rejected.
  /// </summary>
  [TestMethod]
  public void RenewLease_QueuedRun_ThrowsInvalidAnalysisRunTransitionException()
  {
    AnalysisRun run = AnalysisRunTestBuilder.Queued();

    Assert.ThrowsExactly<InvalidAnalysisRunTransitionException>(() =>
      run.RenewLease(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5)));
  }

  /// <summary>
  /// Verifies that completing a running run clears the lease and sets the completion time-to-live.
  /// </summary>
  [TestMethod]
  public void Complete_RunningRun_SetsCompletedStateAndTimeToLive()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ActiveRunning();
    DateTimeOffset completedAt = DateTimeOffset.UtcNow;

    AnalysisRun completed = run.Complete(completedAt, [AnalysisCapability.DocumentExtraction]);

    Assert.AreEqual(AnalysisRunStatus.Completed, completed.Status);
    Assert.AreEqual(completedAt, completed.CompletedAt);
    Assert.IsNull(completed.LeaseOwner);
    Assert.IsNull(completed.LeaseExpiresAt);
    Assert.AreEqual(AnalysisRun.CompletionTimeToLiveSeconds, completed.TimeToLiveSeconds);
    CollectionAssert.AreEqual(
      new[] { AnalysisCapability.DocumentExtraction },
      (System.Collections.Generic.List<AnalysisCapability>)[.. completed.CompletedCapabilities]);
  }

  /// <summary>
  /// Verifies that failing a running run clears the lease, records the failure code, and sets the completion time-to-live.
  /// </summary>
  [TestMethod]
  public void Fail_RunningRun_SetsFailedStateAndTimeToLive()
  {
    AnalysisRun run = AnalysisRunTestBuilder.ActiveRunning();
    DateTimeOffset failedAt = DateTimeOffset.UtcNow;

    AnalysisRun failed = run.Fail("boom", failedAt);

    Assert.AreEqual(AnalysisRunStatus.Failed, failed.Status);
    Assert.AreEqual(failedAt, failed.FailedAt);
    Assert.AreEqual("boom", failed.FailureCode);
    Assert.IsNull(failed.LeaseOwner);
    Assert.IsNull(failed.LeaseExpiresAt);
    Assert.AreEqual(AnalysisRun.CompletionTimeToLiveSeconds, failed.TimeToLiveSeconds);
  }

  /// <summary>
  /// Verifies that failing a queued (never-claimed) run is rejected.
  /// </summary>
  [TestMethod]
  public void Fail_FromQueued_ThrowsInvalidAnalysisRunTransitionException()
  {
    AnalysisRun run = AnalysisRunTestBuilder.Queued();

    Assert.ThrowsExactly<InvalidAnalysisRunTransitionException>(() =>
      run.Fail("boom", DateTimeOffset.UtcNow));
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisRun.CreateInvoice"/> rejects a null options argument.
  /// </summary>
  [TestMethod]
  public void CreateInvoice_NullOptions_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      AnalysisRun.CreateInvoice(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null!, null));

  /// <summary>
  /// Verifies that <see cref="AnalysisRun.CreateInvoice"/> rejects an empty target identifier.
  /// </summary>
  [TestMethod]
  public void CreateInvoice_EmptyTargetId_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      AnalysisRun.CreateInvoice(Guid.Empty, Guid.NewGuid(), Guid.NewGuid(), InvoiceAnalysisOptions.Comprehensive(), null));

  /// <summary>
  /// Verifies that <see cref="AnalysisRun.CreateMerchant"/> produces a queued run with the merchant target type.
  /// </summary>
  [TestMethod]
  public void CreateMerchant_ValidInput_ReturnsQueuedMerchantRun()
  {
    AnalysisRun run = AnalysisRun.CreateMerchant(
      Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), MerchantAnalysisOptions.Comprehensive(), null);

    Assert.AreEqual(AnalysisTargetType.Merchant, run.TargetType);
    Assert.AreEqual(AnalysisRunStatus.Queued, run.Status);
    Assert.IsNotNull(run.MerchantOptions);
    Assert.IsNull(run.InvoiceOptions);
    Assert.AreEqual(AnalysisRun.DefaultBucket, run.Bucket);
    Assert.AreEqual(0, run.AttemptCount);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisRun.WithETag"/> returns a copy carrying the supplied token without altering other state.
  /// </summary>
  [TestMethod]
  public void WithETag_ValidToken_ReturnsCopyWithETag()
  {
    AnalysisRun run = AnalysisRunTestBuilder.Queued();

    AnalysisRun stamped = run.WithETag("\"etag-value\"");

    Assert.AreEqual("\"etag-value\"", stamped.ETag);
    Assert.AreEqual(run.Id, stamped.Id);
  }
}
