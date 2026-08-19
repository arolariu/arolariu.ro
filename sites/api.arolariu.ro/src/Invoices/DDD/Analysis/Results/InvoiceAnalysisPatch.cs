namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;

/// <summary>
/// Represents the set of invoice aggregate mutations derived from a completed analysis run.
/// </summary>
/// <remarks>
/// <para><b>Section semantics:</b> Each member is nullable and independent. A <see langword="null"/> section means the
/// corresponding capability did not produce a usable result during the run — either it was not requested or it failed —
/// and the previously persisted value MUST be left untouched. A non-null section is authoritative and replaces the
/// previously persisted value, including when it carries an empty collection.</para>
/// <para><b>Layer role:</b> This patch makes "what changed" an explicit, inspectable value rather than implicit
/// mutation scattered across the execution path.</para>
/// </remarks>
/// <param name="ExtractionUpdate">The receipt extraction result that rebuilds line items and payment metadata.</param>
/// <param name="SummaryUpdate">The generated invoice name and description.</param>
/// <param name="ProductClassificationUpdate">The per-line-item GPC classifications, keyed by correlation token.</param>
/// <param name="AllergenAssessmentUpdate">The per-line-item allergen assessments, keyed by correlation token.</param>
/// <param name="InvoiceClassificationUpdate">The ECOICOP classification for the invoice as a whole.</param>
/// <param name="RecipeGenerationUpdate">The generated recipe suggestions.</param>
public sealed record InvoiceAnalysisPatch(
  ReceiptExtractionResult? ExtractionUpdate,
  InvoiceSummaryResult? SummaryUpdate,
  ProductClassificationResult? ProductClassificationUpdate,
  ProductAllergenAssessmentResult? AllergenAssessmentUpdate,
  InvoiceClassificationResult? InvoiceClassificationUpdate,
  RecipeGenerationResult? RecipeGenerationUpdate)
{
  /// <summary>
  /// Gets a value indicating whether this patch carries at least one mutation.
  /// </summary>
  public bool HasChanges =>
    ExtractionUpdate is not null
    || SummaryUpdate is not null
    || ProductClassificationUpdate is not null
    || AllergenAssessmentUpdate is not null
    || InvoiceClassificationUpdate is not null
    || RecipeGenerationUpdate is not null;
}
