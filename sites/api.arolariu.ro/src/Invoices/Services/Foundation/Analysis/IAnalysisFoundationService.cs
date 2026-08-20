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
  /// <summary>Extracts and deterministically merges typed receipt data from invoice scans.</summary>
  /// <param name="scans">The non-empty ordered scan collection to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel document analysis.</param>
  /// <returns>The merged provider-neutral receipt extraction.</returns>
  Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates bounded English taxonomy search terms for each supplied classification subject.
  /// </summary>
  /// <param name="capability">The classification capability requesting search terms.</param>
  /// <param name="system">The taxonomy system being searched.</param>
  /// <param name="taxonomyVersion">The loaded trusted taxonomy artifact version.</param>
  /// <param name="subjectDescriptions">Descriptions keyed by transient correlation token.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>One bounded search-term collection for each supplied token.</returns>
  Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> GenerateClassificationSearchTermsAsync(
    AnalysisCapability capability,
    ClassificationSystem system,
    string taxonomyVersion,
    IReadOnlyDictionary<string, string> subjectDescriptions,
    CancellationToken cancellationToken);

  /// <summary>
  /// Selects one offered taxonomy candidate code per supplied subject.
  /// </summary>
  /// <param name="capability">The classification capability requesting candidate selection.</param>
  /// <param name="system">The taxonomy system represented by the candidates.</param>
  /// <param name="taxonomyVersion">The loaded trusted taxonomy artifact version.</param>
  /// <param name="candidatesByToken">Canonical candidate options keyed by transient correlation token.</param>
  /// <param name="cancellationToken">The token used to cancel selection.</param>
  /// <returns>The selected code and confidence for each supplied token.</returns>
  Task<IReadOnlyDictionary<string, SelectedClassificationCandidate>> SelectClassificationCandidatesAsync(
    AnalysisCapability capability,
    ClassificationSystem system,
    string taxonomyVersion,
    IReadOnlyDictionary<string, IReadOnlyList<ClassificationCandidateOption>> candidatesByToken,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise invoice name and description from transient product analysis inputs.
  /// </summary>
  /// <param name="products">The non-empty transient product inputs to summarize.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The generated invoice name and description.</returns>
  Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Assesses EU-14 allergen signals for a batch of transient products.
  /// </summary>
  /// <param name="products">The non-empty transient product inputs to assess.</param>
  /// <param name="classifications">Canonical classifications for the supplied product tokens.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>One allergen assessment for each supplied product token.</returns>
  Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise factual description for a merchant from merchant fields and related invoice evidence.
  /// </summary>
  /// <param name="merchant">The merchant evidence to describe.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The generated factual merchant description.</returns>
  Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates structured recipe suggestions from food-eligible transient products.
  /// </summary>
  /// <param name="products">The non-empty transient product inputs.</param>
  /// <param name="classifications">Canonical classifications for the supplied product tokens.</param>
  /// <param name="allergens">Allergen assessments covering the supplied product tokens.</param>
  /// <param name="maximumRecipes">The requested recipe limit in the inclusive range one through three.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The bounded recipe suggestion collection; it is empty when no product is food-eligible.</returns>
  Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>Gets the loaded taxonomy artifact version.</summary>
  /// <param name="system">The taxonomy system whose artifact version is requested.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>The loaded artifact's declared version.</returns>
  Task<string> GetTaxonomyVersionAsync(
    ClassificationSystem system,
    CancellationToken cancellationToken);

  /// <summary>Searches one taxonomy for bounded canonical candidates.</summary>
  /// <param name="system">The taxonomy system to search.</param>
  /// <param name="query">The search expression.</param>
  /// <param name="maximumResults">The maximum number of candidates to return.</param>
  /// <param name="cancellationToken">The token used to cancel the search.</param>
  /// <returns>The canonical candidate codes and official labels.</returns>
  Task<IReadOnlyList<ClassificationCandidateOption>> SearchTaxonomyAsync(
    ClassificationSystem system,
    string query,
    int maximumResults,
    CancellationToken cancellationToken);

  /// <summary>Resolves one canonical classification snapshot.</summary>
  /// <param name="system">The taxonomy system containing the code.</param>
  /// <param name="code">The code-only classification selection to resolve.</param>
  /// <param name="origin">The origin assigned to the canonical snapshot.</param>
  /// <param name="confidence">The optional confidence assigned to analysis-origin snapshots.</param>
  /// <param name="evidence">The evidence retained with the canonical snapshot.</param>
  /// <param name="cancellationToken">The token used to cancel resolution.</param>
  /// <returns>The canonical classification populated from the trusted artifact.</returns>
  Task<StandardClassification> ResolveClassificationAsync(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence,
    CancellationToken cancellationToken);
}
