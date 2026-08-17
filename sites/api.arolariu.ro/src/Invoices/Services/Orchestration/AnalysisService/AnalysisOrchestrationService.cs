namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Orchestrates the analysis pipeline's durable run lifecycle and its best-effort invoice/merchant capability DAGs.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> This service depends on exactly three foundation services — the analysis
/// run, document analysis, and generative analysis foundations (the Florance Pattern). It never calls invoice or
/// merchant orchestration services, and it never persists analysis outcomes onto entities directly.</para>
/// </remarks>
public sealed partial class AnalysisOrchestrationService : IAnalysisOrchestrationService
{
  private readonly IAnalysisRunFoundationService analysisRunFoundationService;
  private readonly IDocumentAnalysisFoundationService documentAnalysisFoundationService;
  private readonly IGenerativeAnalysisFoundationService generativeAnalysisFoundationService;
  private readonly ILogger<IAnalysisOrchestrationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationService"/> class.
  /// </summary>
  /// <param name="analysisRunFoundationService">The durable analysis run queue foundation service.</param>
  /// <param name="documentAnalysisFoundationService">The deterministic receipt extraction foundation service.</param>
  /// <param name="generativeAnalysisFoundationService">The structured generative analysis foundation service.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when any dependency is null.</exception>
  public AnalysisOrchestrationService(
    IAnalysisRunFoundationService analysisRunFoundationService,
    IDocumentAnalysisFoundationService documentAnalysisFoundationService,
    IGenerativeAnalysisFoundationService generativeAnalysisFoundationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(analysisRunFoundationService);
    ArgumentNullException.ThrowIfNull(documentAnalysisFoundationService);
    ArgumentNullException.ThrowIfNull(generativeAnalysisFoundationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.analysisRunFoundationService = analysisRunFoundationService;
    this.documentAnalysisFoundationService = documentAnalysisFoundationService;
    this.generativeAnalysisFoundationService = generativeAnalysisFoundationService;
    logger = loggerFactory.CreateLogger<IAnalysisOrchestrationService>();
  }

  /// <inheritdoc/>
  public async Task EnsureRunStoreAsync(CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureRunStoreAsync));

    await analysisRunFoundationService
      .EnsureStoreAsync(cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun> QueueInvoiceRunAsync(
    Guid invoiceId,
    Guid ownerIdentifier,
    InvoiceAnalysisOptions options,
    string traceId,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(QueueInvoiceRunAsync));
    ArgumentNullException.ThrowIfNull(options);
    ValidateTraceIdIsSet(traceId);

    InvoiceAnalysisOptions effectiveOptions = AnalysisProfileResolver.Resolve(options);
    AnalysisRun run = AnalysisRun.CreateInvoice(
      invoiceId,
      ownerIdentifier,
      Guid.CreateVersion7(),
      effectiveOptions,
      traceId);

    AnalysisRun created = await analysisRunFoundationService
      .CreateRunAsync(run, cancellationToken)
      .ConfigureAwait(false);
    return created;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun> QueueMerchantRunAsync(
    Guid merchantId,
    Guid ownerIdentifier,
    Guid parentCompanyId,
    MerchantAnalysisOptions options,
    string traceId,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantRunAsync));
    ArgumentNullException.ThrowIfNull(options);
    ValidateTraceIdIsSet(traceId);

    MerchantAnalysisOptions effectiveOptions = AnalysisProfileResolver.Resolve(options);
    AnalysisRun run = AnalysisRun.CreateMerchant(
      merchantId,
      ownerIdentifier,
      Guid.CreateVersion7(),
      parentCompanyId,
      effectiveOptions,
      traceId);

    AnalysisRun created = await analysisRunFoundationService
      .CreateRunAsync(run, cancellationToken)
      .ConfigureAwait(false);
    return created;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisRun?> ClaimNextRunAsync(
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ClaimNextRunAsync));

    AnalysisRun? claimed = await analysisRunFoundationService
      .ClaimNextRunAsync(leaseOwner, now, leaseDuration, cancellationToken)
      .ConfigureAwait(false);
    return claimed;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task RenewRunLeaseAsync(
    Guid runId,
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(RenewRunLeaseAsync));

    await analysisRunFoundationService
      .RenewLeaseAsync(runId, leaseOwner, now, leaseDuration, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task CompleteRunAsync(
    Guid runId,
    string leaseOwner,
    IReadOnlyCollection<AnalysisCapability> completedCapabilities,
    DateTimeOffset completedAt,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CompleteRunAsync));

    await analysisRunFoundationService
      .CompleteRunAsync(runId, leaseOwner, completedCapabilities, completedAt, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task FailRunAsync(
    Guid runId,
    string leaseOwner,
    string failureCode,
    DateTimeOffset failedAt,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(FailRunAsync));

    await analysisRunFoundationService
      .FailRunAsync(runId, leaseOwner, failureCode, failedAt, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);

  /// <summary>
  /// Rejects runs that would be persisted without a usable distributed-tracing correlation identifier.
  /// </summary>
  /// <remarks>
  /// <para>A durable run is the only correlation anchor between the accepting HTTP request and the deferred worker
  /// execution. Persisting a blank trace identifier would silently break that link for the entire lifetime of the run,
  /// so the guard runs before the aggregate factory rather than after persistence.</para>
  /// </remarks>
  /// <param name="traceId">The caller-supplied W3C trace identifier.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="traceId"/> is null, empty, or whitespace.</exception>
  private static void ValidateTraceIdIsSet(string traceId)
  {
    if (string.IsNullOrWhiteSpace(traceId))
    {
      throw new ArgumentException("Trace identifier must be set.", nameof(traceId));
    }
  }
}
