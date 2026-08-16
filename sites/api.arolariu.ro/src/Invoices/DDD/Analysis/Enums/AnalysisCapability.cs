namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Enumerates the discrete capabilities that can participate in the analysis pipeline.
/// </summary>
public enum AnalysisCapability
{
  /// <summary>Extract document structure and OCR-derived invoice fields.</summary>
  DocumentExtraction,

  /// <summary>Resolve or correlate the invoice merchant.</summary>
  MerchantResolution,

  /// <summary>Produce an invoice-level natural-language summary.</summary>
  InvoiceSummary,

  /// <summary>Assign canonical classifications to invoice products.</summary>
  ProductClassification,

  /// <summary>Assess EU-14 allergen risks for invoice products.</summary>
  AllergenAssessment,

  /// <summary>Assign invoice-wide taxonomy classifications.</summary>
  InvoiceClassification,

  /// <summary>Generate recipe suggestions from purchased products.</summary>
  RecipeGeneration,

  /// <summary>Assign merchant-level taxonomy classifications.</summary>
  MerchantClassification,

  /// <summary>Generate a natural-language merchant description.</summary>
  DescriptionGeneration,
}
