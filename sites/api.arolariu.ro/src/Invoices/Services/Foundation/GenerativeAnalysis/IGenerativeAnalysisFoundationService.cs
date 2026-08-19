namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Defines the reusable structured generation engine used by the analysis pipeline.
/// </summary>
/// <remarks>
/// This foundation service is the only invoice-domain foundation that talks directly to the generative analysis
/// broker. It produces structured search terms, candidate selections, summaries, allergen assessments, descriptions,
/// and recipes, but never resolves taxonomy codes or persists aggregates.
/// </remarks>
public interface IGenerativeAnalysisFoundationService
{
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
}
