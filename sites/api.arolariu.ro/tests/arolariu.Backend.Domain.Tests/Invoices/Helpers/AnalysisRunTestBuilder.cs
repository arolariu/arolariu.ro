namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Test data builder for <see cref="AnalysisRun"/> aggregates following test naming and data generation patterns.
/// </summary>
internal static class AnalysisRunTestBuilder
{
  /// <summary>
  /// The lease owner assigned to runs produced by <see cref="ExpiredRunning"/> and <see cref="ActiveRunning"/>.
  /// </summary>
  public const string DefaultLeaseOwner = "worker-a";

  /// <summary>
  /// Creates a freshly queued invoice analysis run, not yet claimed by any worker.
  /// </summary>
  /// <returns>A queued <see cref="AnalysisRun"/>.</returns>
  public static AnalysisRun Queued() =>
    AnalysisRun.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

  /// <summary>
  /// Creates a running invoice analysis run whose lease has already expired, eligible for reclaim by another worker.
  /// </summary>
  /// <returns>A running <see cref="AnalysisRun"/> with an expired lease.</returns>
  public static AnalysisRun ExpiredRunning()
  {
    AnalysisRun queued = Queued();
    AnalysisRun claimed = queued.Claim(DefaultLeaseOwner, DateTimeOffset.UtcNow.AddMinutes(-10), TimeSpan.FromMinutes(5));
    return claimed;
  }

  /// <summary>
  /// Creates a running invoice analysis run whose lease is still active.
  /// </summary>
  /// <returns>A running <see cref="AnalysisRun"/> with an active lease.</returns>
  public static AnalysisRun ActiveRunning()
  {
    AnalysisRun queued = Queued();
    AnalysisRun claimed = queued.Claim(DefaultLeaseOwner, DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5));
    return claimed;
  }

  /// <summary>
  /// Creates a merchant analysis run in the given status, bypassing normal transition validation for test setup only.
  /// </summary>
  /// <param name="status">The desired terminal status (<see cref="AnalysisRunStatus.Completed"/> or <see cref="AnalysisRunStatus.Failed"/>).</param>
  /// <returns>A terminal-state <see cref="AnalysisRun"/>.</returns>
  public static AnalysisRun Terminal(AnalysisRunStatus status)
  {
    AnalysisRun active = ActiveRunning();
    return status switch
    {
      AnalysisRunStatus.Completed => active.Complete(DateTimeOffset.UtcNow, [AnalysisCapability.DocumentExtraction]),
      AnalysisRunStatus.Failed => active.Fail("boom", DateTimeOffset.UtcNow),
      _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Only Completed and Failed are supported terminal states."),
    };
  }
}
