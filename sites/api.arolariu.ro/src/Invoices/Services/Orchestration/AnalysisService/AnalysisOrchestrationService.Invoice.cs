namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisOrchestrationService
{
  /// <inheritdoc/>
  public async Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ExtractInvoiceAsync));
      return await analysisFoundationService
        .ExtractInvoiceAsync(scans, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateInvoiceSummaryAsync));
      return await analysisFoundationService
        .GenerateInvoiceSummaryAsync(products, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AssessAllergensAsync));
      return await analysisFoundationService
        .AssessAllergensAsync(products, classifications, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateRecipesAsync));
      return await analysisFoundationService
        .GenerateRecipesAsync(products, classifications, allergens, maximumRecipes, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
