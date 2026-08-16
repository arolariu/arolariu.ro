namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Defines the reusable structured analysis engine that produces invoice summaries, product allergen assessments,
/// canonical classifications, and recipe suggestions using typed generative AI outputs.
/// </summary>
/// <remarks>
/// <para>
/// Implementations MUST batch all requested subjects into single structured generation calls per phase, preserve
/// exactly one result per transient correlation token, and resolve every AI-selected code through the canonical
/// taxonomy broker before returning it. Implementations MUST NOT persist aggregates or parse free-text fallbacks.
/// </para>
/// <para><b>Taxonomy mapping:</b> Products classify against GS1 GPC, invoices against ECOICOP v2, and merchants
/// against NACE 2.1. Merchant descriptions are generated as concise typed structured outputs from merchant fields
/// and related invoice evidence.</para>
/// </remarks>
public interface IGenerativeAnalysisFoundationService
{
  /// <summary>
  /// Classifies a batch of transient products against the GS1 Global Product Classification (GPC) taxonomy.
  /// </summary>
  /// <param name="products">The transient product analysis inputs to classify.</param>
  /// <param name="cancellationToken">The cancellation token that aborts classification.</param>
  /// <returns>The canonical GPC classifications keyed by transient correlation token.</returns>
  Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken);

  /// <summary>
  /// Classifies a typed receipt extraction against the ECOICOP v2 taxonomy.
  /// </summary>
  /// <param name="extraction">The merged typed receipt extraction result for the analysis run.</param>
  /// <param name="products">The previously resolved product classifications for the same analysis run.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this classification request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts classification.</param>
  /// <returns>The canonical ECOICOP v2 classification for the invoice.</returns>
  Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Classifies a merchant against the NACE 2.1 taxonomy.
  /// </summary>
  /// <param name="merchant">The merchant to classify.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this classification request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts classification.</param>
  /// <returns>The canonical NACE 2.1 classification for the merchant.</returns>
  Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise factual description for a merchant from merchant fields and related invoice evidence.
  /// </summary>
  /// <param name="merchant">The merchant to describe.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this description request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts description generation.</param>
  /// <returns>The structured merchant description result.</returns>
  Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise invoice name and description from transient product analysis inputs.
  /// </summary>
  /// <param name="products">The transient product analysis inputs representing the invoice contents.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this summary request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts summary generation.</param>
  /// <returns>The structured invoice summary result.</returns>
  Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Assesses EU-14 allergen signals for a batch of transient products.
  /// </summary>
  /// <param name="products">The transient product analysis inputs to assess.</param>
  /// <param name="classifications">The canonical GPC classifications resolved for the same product batch.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this assessment request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts allergen assessment.</param>
  /// <returns>The structured allergen assessments keyed by transient correlation token.</returns>
  Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates structured recipe suggestions from food-eligible transient products.
  /// </summary>
  /// <param name="products">The transient product analysis inputs for the invoice.</param>
  /// <param name="classifications">The canonical GPC classifications resolved for the same product batch.</param>
  /// <param name="allergens">The allergen assessments resolved for the same product batch.</param>
  /// <param name="maximumRecipes">The maximum number of recipes to generate in the inclusive range <c>[1, 3]</c>.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this recipe request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts recipe generation.</param>
  /// <returns>The structured recipe generation result.</returns>
  Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    Guid sourceRunId,
    CancellationToken cancellationToken);
}
