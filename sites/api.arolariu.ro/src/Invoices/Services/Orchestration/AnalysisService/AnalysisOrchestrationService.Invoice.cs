namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

public sealed partial class AnalysisOrchestrationService
{
  /// <summary>Delegates typed receipt extraction to the unified analysis foundation.</summary>
  /// <param name="scans">The ordered invoice scans to extract.</param>
  /// <param name="cancellationToken">The token used to cancel extraction.</param>
  /// <returns>The deterministic merged receipt extraction.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the foundation rejects the scan input.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when document analysis fails.
  /// </exception>
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

  /// <summary>Delegates invoice summary generation to the unified analysis foundation.</summary>
  /// <param name="products">The transient product inputs to summarize.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The validated invoice summary.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the foundation rejects the products or correlation identifier.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
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

  /// <summary>Delegates EU-14 allergen assessment to the unified analysis foundation.</summary>
  /// <param name="products">The transient product inputs to assess.</param>
  /// <param name="classifications">Canonical classifications covering the supplied products.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The allergen assessments keyed by product token.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when required input is absent or inconsistent.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
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

  /// <summary>Delegates bounded recipe generation to the unified analysis foundation.</summary>
  /// <param name="products">The transient product inputs available to recipes.</param>
  /// <param name="classifications">Canonical classifications covering the products.</param>
  /// <param name="allergens">Allergen assessments covering the products.</param>
  /// <param name="maximumRecipes">The requested recipe limit.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The validated bounded recipe collection.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when required input is absent, inconsistent, or outside supported bounds.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
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
