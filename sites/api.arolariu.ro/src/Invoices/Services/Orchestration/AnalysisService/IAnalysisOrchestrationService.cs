namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Defines the orchestration-layer boundary for durable analysis runs and non-classification capabilities.
/// </summary>
public interface IAnalysisOrchestrationService
{
  /// <summary>
  /// Ensures the durable analysis-run store exists.
  /// </summary>
  Task EnsureRunStoreAsync(CancellationToken cancellationToken);

  /// <summary>
  /// Queues a durable invoice analysis run with already-resolved effective options.
  /// </summary>
  Task<AnalysisRun> QueueInvoiceRunAsync(
    Guid invoiceId,
    Guid ownerIdentifier,
    InvoiceAnalysisOptions options,
    string traceId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Queues a durable merchant analysis run with already-resolved effective options.
  /// </summary>
  Task<AnalysisRun> QueueMerchantRunAsync(
    Guid merchantId,
    Guid ownerIdentifier,
    Guid parentCompanyId,
    MerchantAnalysisOptions options,
    string traceId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Claims the next available durable analysis run.
  /// </summary>
  Task<AnalysisRun?> ClaimNextRunAsync(
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken);

  /// <summary>
  /// Counts currently pending durable runs by target type.
  /// </summary>
  Task<IReadOnlyDictionary<AnalysisTargetType, long>> CountPendingRunsAsync(
    DateTimeOffset now,
    CancellationToken cancellationToken);

  /// <summary>
  /// Renews the lease of a claimed durable run.
  /// </summary>
  Task RenewRunLeaseAsync(
    Guid runId,
    string leaseOwner,
    DateTimeOffset now,
    TimeSpan leaseDuration,
    CancellationToken cancellationToken);

  /// <summary>
  /// Marks a claimed durable run as completed.
  /// </summary>
  Task CompleteRunAsync(
    Guid runId,
    string leaseOwner,
    IReadOnlyCollection<AnalysisCapability> completedCapabilities,
    DateTimeOffset completedAt,
    CancellationToken cancellationToken);

  /// <summary>
  /// Marks a claimed durable run as failed.
  /// </summary>
  Task FailRunAsync(
    Guid runId,
    string leaseOwner,
    string failureCode,
    DateTimeOffset failedAt,
    CancellationToken cancellationToken);

  /// <summary>
  /// Extracts typed receipt data from already-approved invoice scans.
  /// </summary>
  Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates an invoice summary from transient product analysis inputs.
  /// </summary>
  Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Assesses allergens for transient product analysis inputs.
  /// </summary>
  Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates recipe suggestions from classified and allergen-assessed products.
  /// </summary>
  Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a merchant description from merchant evidence.
  /// </summary>
  Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);
}
