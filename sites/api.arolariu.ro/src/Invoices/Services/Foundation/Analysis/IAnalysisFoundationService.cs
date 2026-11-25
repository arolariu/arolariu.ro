namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Defines independent OCR and generative operations used by Analysis Orchestration.
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
  Task<ReceiptExtraction> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken);

  /// <summary>Selects a product category or abstains for each requested token.</summary>
  Task<IReadOnlyDictionary<string, ProductCategory?>> SelectProductCategoriesAsync(
    IReadOnlyDictionary<string, string> subjects, CancellationToken cancellationToken);

  /// <summary>Selects an invoice category or abstains for each requested token.</summary>
  Task<IReadOnlyDictionary<string, InvoiceCategory?>> SelectInvoiceCategoriesAsync(
    IReadOnlyDictionary<string, string> subjects, CancellationToken cancellationToken);

  /// <summary>Selects a merchant category or abstains for each requested token.</summary>
  Task<IReadOnlyDictionary<string, MerchantCategory?>> SelectMerchantCategoriesAsync(
    IReadOnlyDictionary<string, string> subjects, CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise invoice name and description from transient product analysis inputs.
  /// </summary>
  /// <param name="products">The non-empty transient product inputs to summarize.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The generated invoice name and description.</returns>
  Task<(string Name, string Description)> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Assesses EU-14 allergen signals for a batch of transient products.
  /// </summary>
  /// <param name="products">The non-empty transient product inputs to assess.</param>
  /// <param name="categories">Optional categories for the supplied product tokens.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>One allergen assessment for each supplied product token.</returns>
  Task<IReadOnlyDictionary<string, AllergenAssessment>> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    IReadOnlyDictionary<string, ProductCategory?> categories,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates a concise factual description for a merchant from its supplied fields.
  /// </summary>
  /// <param name="merchant">The merchant evidence to describe.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The generated factual merchant description.</returns>
  Task<string> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Generates structured recipe suggestions from food-eligible transient products.
  /// </summary>
  /// <param name="products">The non-empty transient product inputs.</param>
  /// <param name="categories">Optional categories for the supplied product tokens.</param>
  /// <param name="allergens">Allergen assessments covering the supplied product tokens.</param>
  /// <param name="maximumRecipes">The requested recipe limit in the inclusive range one through three.</param>
  /// <param name="sourceRunId">The non-empty durable analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The bounded recipe suggestion collection; it is empty when no product is food-eligible.</returns>
  Task<IReadOnlyList<RecipeSuggestion>> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    IReadOnlyDictionary<string, ProductCategory?> categories,
    IReadOnlyDictionary<string, AllergenAssessment> allergens,
    int maximumRecipes,
    Guid sourceRunId,
    CancellationToken cancellationToken);

}
