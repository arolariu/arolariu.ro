namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Defines independent OCR, generative, and taxonomy operations used by Analysis Orchestration.
/// </summary>
/// <remarks>
/// This Foundation never sequences a multi-capability workflow and never persists aggregates.
/// </remarks>
public interface IAnalysisFoundationService
{
  /// <summary>Extracts and merges receipt data from invoice scans.</summary>
  Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates bounded English taxonomy search terms for each supplied classification subject.
  /// </summary>
  Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> GenerateClassificationSearchTermsAsync(
    AnalysisCapability capability,
    ClassificationSystem system,
    string taxonomyVersion,
    IReadOnlyDictionary<string, string> subjectDescriptions,
    CancellationToken cancellationToken);

  /// <summary>
  /// Selects one offered taxonomy candidate code per supplied subject.
  /// </summary>
  Task<IReadOnlyDictionary<string, SelectedClassificationCandidate>> SelectClassificationCandidatesAsync(
    AnalysisCapability capability,
    ClassificationSystem system,
    string taxonomyVersion,
    IReadOnlyDictionary<string, IReadOnlyList<ClassificationCandidateOption>> candidatesByToken,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise invoice name and description from transient product analysis inputs.
  /// </summary>
  Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Assesses EU-14 allergen signals for a batch of transient products.
  /// </summary>
  Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise factual description for a merchant from merchant fields and related invoice evidence.
  /// </summary>
  Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates structured recipe suggestions from food-eligible transient products.
  /// </summary>
  Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>Gets the loaded taxonomy artifact version.</summary>
  Task<string> GetTaxonomyVersionAsync(
    ClassificationSystem system,
    CancellationToken cancellationToken);

  /// <summary>Searches one taxonomy for bounded canonical candidates.</summary>
  Task<IReadOnlyList<ClassificationCandidateOption>> SearchTaxonomyAsync(
    ClassificationSystem system,
    string query,
    int maximumResults,
    CancellationToken cancellationToken);

  /// <summary>Resolves one canonical classification snapshot.</summary>
  Task<StandardClassification> ResolveClassificationAsync(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence,
    CancellationToken cancellationToken);
}
