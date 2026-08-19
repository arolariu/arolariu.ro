namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Enumerates the discrete capabilities that can participate in the analysis pipeline.
/// </summary>
[JsonConverter(typeof(StrictStringEnumConverter<AnalysisCapability>))]
public enum AnalysisCapability
{
  /// <summary>Extract document structure and OCR-derived invoice fields.</summary>
  [JsonStringEnumMemberName("documentExtraction")]
  DocumentExtraction,

  /// <summary>Produce an invoice-level natural-language summary.</summary>
  [JsonStringEnumMemberName("invoiceSummary")]
  InvoiceSummary,

  /// <summary>Assign canonical classifications to invoice products.</summary>
  [JsonStringEnumMemberName("productClassification")]
  ProductClassification,

  /// <summary>Assess EU-14 allergen risks for invoice products.</summary>
  [JsonStringEnumMemberName("allergenAssessment")]
  AllergenAssessment,

  /// <summary>Assign invoice-wide taxonomy classifications.</summary>
  [JsonStringEnumMemberName("invoiceClassification")]
  InvoiceClassification,

  /// <summary>Generate recipe suggestions from purchased products.</summary>
  [JsonStringEnumMemberName("recipeGeneration")]
  RecipeGeneration,

  /// <summary>Assign merchant-level taxonomy classifications.</summary>
  [JsonStringEnumMemberName("merchantClassification")]
  MerchantClassification,

  /// <summary>Generate a natural-language merchant description.</summary>
  [JsonStringEnumMemberName("descriptionGeneration")]
  DescriptionGeneration,
}
