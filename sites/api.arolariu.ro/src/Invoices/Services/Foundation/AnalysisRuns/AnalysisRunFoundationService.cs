namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

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

    var claimed = await analysisRunBroker
      .ClaimNextAsync(leaseOwner, now, leaseDuration, cancellationToken)
      .ConfigureAwait(false);
    return claimed;
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
