namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

/// <summary>
/// Represents the per-capability overrides a caller may layer over an invoice analysis profile preset.
/// </summary>
/// <remarks>
/// <para>Every member is optional. Omitted members inherit the resolved preset value. Any supplied member downgrades
/// the effective profile to <see cref="DDD.Analysis.Enums.AnalysisProfile.Custom"/>, because the resulting capability
/// set no longer matches a published preset.</para>
/// <para><b>Dependency closure:</b> Allergen assessment requires product classification, and recipe generation requires
/// both product classification and allergen assessment. Violating overrides are rejected rather than silently repaired.</para>
/// </remarks>
/// <param name="DocumentExtraction">Overrides receipt OCR extraction.</param>
/// <param name="MerchantResolution">Overrides merchant candidate resolution.</param>
/// <param name="InvoiceSummary">Overrides invoice name and description generation.</param>
/// <param name="ProductClassification">Overrides GPC product classification.</param>
/// <param name="AllergenAssessment">Overrides per-product allergen assessment.</param>
/// <param name="InvoiceClassification">Overrides ECOICOP invoice classification.</param>
/// <param name="RecipeGeneration">Overrides recipe generation and its result cap.</param>
[Serializable]
public readonly record struct InvoiceAnalysisOverridesDto(
  CapabilityToggleDto? DocumentExtraction,
  CapabilityToggleDto? MerchantResolution,
  CapabilityToggleDto? InvoiceSummary,
  CapabilityToggleDto? ProductClassification,
  CapabilityToggleDto? AllergenAssessment,
  CapabilityToggleDto? InvoiceClassification,
  RecipeGenerationOverrideDto? RecipeGeneration);
