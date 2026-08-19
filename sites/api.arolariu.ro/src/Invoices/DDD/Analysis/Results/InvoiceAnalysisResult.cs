namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the transient, best-effort outcome of a single invoice analysis run.
/// </summary>
/// <remarks>
/// <para>Each capability section is independently nullable: a <see langword="null"/> section means either the
/// capability was disabled by the run's effective <c>InvoiceAnalysisOptions</c>, or the capability was attempted
/// and failed. Callers MUST NOT infer disablement vs. failure from a null section alone; use
/// <see cref="CompletedCapabilities"/> to distinguish attempted-and-failed from never-attempted.</para>
/// <para><b>Merchant resolution:</b> <see cref="MerchantCandidateResult"/> carries only the transient merchant
/// candidate observed during document extraction. Resolving (or creating) the durable <c>Merchant</c> aggregate
/// referenced by this candidate is owned by later processing-layer work, not by this orchestration result.</para>
/// </remarks>
/// <param name="ExtractionResult">The merged typed receipt extraction result, or <see langword="null"/> when extraction was disabled or failed.</param>
/// <param name="MerchantCandidateResult">The transient merchant candidate observed during extraction, or <see langword="null"/> when unavailable.</param>
/// <param name="SummaryResult">The generated invoice summary, or <see langword="null"/> when summarization was disabled or failed.</param>
/// <param name="ProductClassificationResult">The canonical GPC product classifications, or <see langword="null"/> when classification was disabled or failed.</param>
/// <param name="AllergenAssessmentResult">The EU-14 allergen assessments, or <see langword="null"/> when assessment was disabled, skipped, or failed.</param>
/// <param name="InvoiceClassificationResult">The canonical ECOICOP v2 invoice classification, or <see langword="null"/> when classification was disabled, skipped, or failed.</param>
/// <param name="RecipeGenerationResult">The generated recipe suggestions, or <see langword="null"/> when recipe generation was disabled, skipped, or failed.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result during this run.</param>
public sealed record InvoiceAnalysisResult(
  ReceiptExtractionResult? ExtractionResult,
  MerchantCandidate? MerchantCandidateResult,
  InvoiceSummaryResult? SummaryResult,
  ProductClassificationResult? ProductClassificationResult,
  ProductAllergenAssessmentResult? AllergenAssessmentResult,
  InvoiceClassificationResult? InvoiceClassificationResult,
  RecipeGenerationResult? RecipeGenerationResult,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities);
