namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

internal readonly record struct GenerativeTelemetryMetadata(
  AnalysisCapability Capability, string SchemaVersion, string PromptVersion);

internal static class GenerativeTelemetryCatalog
{
  internal static GenerativeTelemetryMetadata ForCapability(AnalysisCapability capability) => capability switch
  {
    AnalysisCapability.InvoiceSummary => new(capability, "invoice-summary-schema-v1", "invoice-summary-prompt-v1"),
    AnalysisCapability.AllergenAssessment => new(capability, "eu14-allergen-assessment-schema-v1", "eu14-allergen-assessment-prompt-v2"),
    AnalysisCapability.RecipeGeneration => new(capability, "basket-recipe-generation-schema-v2", "basket-recipe-generation-prompt-v2"),
    AnalysisCapability.DescriptionGeneration => new(capability, "merchant-description-schema-v1", "merchant-description-prompt-v1"),
    AnalysisCapability.ProductClassification => new(capability, "product-category-schema-v1", "product-category-prompt-v1"),
    AnalysisCapability.InvoiceClassification => new(capability, "invoice-category-schema-v1", "invoice-category-prompt-v1"),
    AnalysisCapability.MerchantClassification => new(capability, "merchant-category-schema-v1", "merchant-category-prompt-v1"),
    _ => throw new ArgumentOutOfRangeException(nameof(capability), capability, "The capability does not use structured generation."),
  };
}
