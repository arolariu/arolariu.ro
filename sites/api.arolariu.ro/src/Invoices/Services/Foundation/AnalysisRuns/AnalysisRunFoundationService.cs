namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// The Analysis Run foundation service.
/// </summary>
public partial class AnalysisRunFoundationService : IAnalysisRunFoundationService
{
  private readonly IAnalysisRunBroker analysisRunBroker;
  private readonly ILogger<IAnalysisRunFoundationService> logger;

  /// <summary>
  /// Constructor.
  /// </summary>
  /// <param name="analysisRunBroker"></param>
  /// <param name="loggerFactory"></param>
  public AnalysisRunFoundationService(
    IAnalysisRunBroker analysisRunBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(analysisRunBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    this.analysisRunBroker = analysisRunBroker;
    this.logger = loggerFactory.CreateLogger<IAnalysisRunFoundationService>();
  }

  /// <inheritdoc/>
  public async Task EnsureStoreAsync(CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureStoreAsync));

    await analysisRunBroker
      .EnsureContainerAsync(cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun> CreateRunAsync(
    AnalysisRun run,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateRunAsync));
    ValidateRunIsSet(run);

    var created = await analysisRunBroker
      .CreateAsync(run, cancellationToken)
      .ConfigureAwait(false);
    return created;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun?> ClaimNextRunAsync(
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken) =>
  await TryCatchNullableAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ClaimNextRunAsync));
    ValidateLeaseOwnerIsSet(leaseOwner);
    ValidateLeaseDurationIsPositive(leaseDuration);

    int inspectedCandidates = 0;

    // Claim coordination lives here, not in the broker: choosing a candidate, reacting to a state transition that
    // raced the scan, and retrying after a lost optimistic-concurrency race are policy decisions about how the
    // pipeline shares work between workers. The broker only projects candidates and replaces documents (RFC 2003).
    await foreach (var candidate in analysisRunBroker
      .StreamClaimCandidatesAsync(now, cancellationToken)
      .ConfigureAwait(false))
    {
      cancellationToken.ThrowIfCancellationRequested();
      inspectedCandidates++;

      AnalysisRun claimed;
      try
      {
        claimed = candidate.Claim(leaseOwner, now, leaseDuration);
      }
      catch (InvalidAnalysisRunTransitionException)
      {
        // The candidate's state moved on between the scan and the claim attempt; skip it.
        continue;
      }

      try
      {
        var persisted = await analysisRunBroker
          .ReplaceAsync(claimed, candidate.ETag, cancellationToken)
          .ConfigureAwait(false);

        activity?.SetTag("analysis.claim.candidates_inspected", inspectedCandidates);
        activity?.SetTag("analysis.claim.claimed", true);
        return persisted;
      }
      catch (AnalysisRunLeaseConflictException)
      {
        // A concurrent worker won the race for this candidate; fall through to the next-oldest one.
        continue;
      }
      catch (AnalysisRunNotFoundException)
      {
        // The candidate was removed (TTL expiry or an administrative delete) between the scan and the replace.
        continue;
      }
    }

    activity?.SetTag("analysis.claim.candidates_inspected", inspectedCandidates);
    activity?.SetTag("analysis.claim.claimed", false);
    return null;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IReadOnlyDictionary<AnalysisTargetType, long>> CountPendingRunsAsync(
    DateTimeOffset now,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CountPendingRunsAsync));

    var counts = await analysisRunBroker
      .CountPendingByTargetTypeAsync(now, cancellationToken)
      .ConfigureAwait(false);

    ArgumentNullException.ThrowIfNull(counts);

    // Every known target type is reported, so a queue that just drained publishes an explicit zero rather than
    // leaving the previous non-zero depth standing in the gauge forever.
    var complete = new Dictionary<AnalysisTargetType, long>();
    foreach (AnalysisTargetType targetType in Enum.GetValues<AnalysisTargetType>())
    {
      complete[targetType] = counts.TryGetValue(targetType, out long count) ? count : 0L;
    }

    return (IReadOnlyDictionary<AnalysisTargetType, long>)complete;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun> RenewLeaseAsync(
    Guid runId,
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(RenewLeaseAsync));
    ValidateRunIdIsSet(runId);
    ValidateLeaseOwnerIsSet(leaseOwner);
    ValidateLeaseDurationIsPositive(leaseDuration);

    var existingRun = await analysisRunBroker.ReadAsync(runId, cancellationToken).ConfigureAwait(false);
    var run = ValidateRunExistsAndLeaseOwnerMatches(existingRun, runId, leaseOwner);

    var renewedRun = run.RenewLease(now, leaseDuration);
    var replacedRun = await analysisRunBroker
      .ReplaceAsync(renewedRun, run.ETag, cancellationToken)
      .ConfigureAwait(false);
    return replacedRun;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun> CompleteRunAsync(
    Guid runId,
    string leaseOwner,
    IReadOnlyCollection<AnalysisCapability> completedCapabilities,
    DateTimeOffset completedAt,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CompleteRunAsync));
    ValidateRunIdIsSet(runId);
    ValidateLeaseOwnerIsSet(leaseOwner);
    ValidateCompletedCapabilitiesAreSet(completedCapabilities);

    var existingRun = await analysisRunBroker.ReadAsync(runId, cancellationToken).ConfigureAwait(false);
    var run = ValidateRunExistsAndLeaseOwnerMatches(existingRun, runId, leaseOwner);

    var completedRun = run.Complete(completedAt, completedCapabilities);
    var replacedRun = await analysisRunBroker
      .ReplaceAsync(completedRun, run.ETag, cancellationToken)
      .ConfigureAwait(false);
    return replacedRun;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun> FailRunAsync(
    Guid runId,
    string leaseOwner,
    string failureCode,
    DateTimeOffset failedAt,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(FailRunAsync));
    ValidateRunIdIsSet(runId);
    ValidateLeaseOwnerIsSet(leaseOwner);
    ValidateFailureCodeIsSet(failureCode);

    var existingRun = await analysisRunBroker.ReadAsync(runId, cancellationToken).ConfigureAwait(false);
    var run = ValidateRunExistsAndLeaseOwnerMatches(existingRun, runId, leaseOwner);

    var failedRun = run.Fail(failureCode, failedAt);
    var replacedRun = await analysisRunBroker
      .ReplaceAsync(failedRun, run.ETag, cancellationToken)
      .ConfigureAwait(false);
    return replacedRun;
  }).ConfigureAwait(false);
}
