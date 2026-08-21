namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// Represents a single invoice line item (product) enriched via OCR and AI classification pipelines.
/// </summary>
/// <remarks>
/// <para>Encapsulates product name (<c>Name</c>), standardised classification
/// (<c>Classification</c>), quantitative details (<c>Quantity</c>, <c>QuantityUnit</c>), commercial identifiers (<c>ProductCode</c>), pricing
/// (<c>Price</c>, computed <c>TotalPrice</c>) and analysis artifacts (<c>AllergenAssessment</c>, <c>Metadata</c>).</para>
/// <para><b>Identity:</b> This value object is deliberately identity-free. Line items are correlated to analysis results
/// positionally, by their ordinal within the owning invoice.</para>
/// <para><b>Lifecycle:</b> Instances are owned by the containing invoice aggregate and are persisted as embedded documents
/// (Cosmos owned collection). They SHOULD NOT be shared across invoice aggregates.</para>
/// <para><b>Analysis:</b> <c>Classification</c> and <c>AllergenAssessment</c> are progressively enriched; both are
/// <see langword="null"/> until an analysis run or a manual selection populates them.</para>
/// <para><b>Thread-safety:</b> Not thread-safe; mutate only within the aggregate's modification workflow.</para>
/// </remarks>
[Owned]
public class Product
{
  /// <summary>The name of the product as extracted from the invoice via OCR.</summary>
  /// <remarks><para>Used for display, aggregation, allergen inference heuristics and recipe matching. May be empty prior to enrichment.</para></remarks>
  [JsonPropertyOrder(0)]
  public string Name { get; set; } = string.Empty;

  /// <summary>Standardised classification assigned to this product.</summary>
  /// <remarks>
  /// <para><b>Expected system:</b> <see cref="ClassificationSystem.Gs1Gpc"/>. Processing resolves every manual selection canonically before persistence.</para>
  /// <para><see langword="null"/> means the line item has not been classified yet.</para>
  /// </remarks>
  [JsonPropertyOrder(1)]
  public StandardClassification? Classification { get; set; }

  /// <summary>Quantity of the product associated with the unit indicated by <see cref="QuantityUnit"/>.</summary>
  /// <remarks><para>Must be non-negative. Zero often indicates an OCR failure and SHOULD be corrected upstream.</para></remarks>
  [JsonPropertyOrder(2)]
  public decimal Quantity { get; set; } = 0;

  /// <summary>Unit of measure for <see cref="Quantity"/> (e.g. "kg", "ml", "pcs").</summary>
  /// <remarks><para>Empty string denotes unspecified unit; downstream analytics may treat such entries as unit-less discrete counts.</para></remarks>
  [JsonPropertyOrder(3)]
  public string QuantityUnit { get; set; } = string.Empty;

  /// <summary>Optional SKU / barcode / internal product identifier.</summary>
  /// <remarks><para>Used for deterministic normalization where available. May be empty if not captured by OCR or invoice source.</para></remarks>
  [JsonPropertyOrder(4)]
  public string ProductCode { get; set; } = string.Empty;

  /// <summary>Unit price expressed in the parent invoice’s currency.</summary>
  /// <remarks>
  /// <para>Represents the effective per-unit value (post-discount if already applied upstream). Non-negative decimal. Range pricing or “per unit” expressions
  /// (e.g. “1.99 / kg”) are normalized prior to persistence; variability / ambiguity SHOULD be resolved in enrichment pipeline.</para>
  /// </remarks>
  [JsonPropertyOrder(5)]
  public decimal Price { get; set; } = 0;

  /// <summary>Computed extended line total (= <c>Quantity * Price</c>).</summary>
  /// <value>Zero when either quantity or price not yet enriched.</value>
  [JsonIgnore]
  public decimal TotalPrice => Quantity * Price;

  /// <summary>The structured allergen assessment produced for this product by an analysis run.</summary>
  /// <remarks>
  /// <para><see langword="null"/> means no allergen assessment has been produced yet. An assessment carries its own
  /// status (detected / no signals / insufficient data) so an empty signal list is never ambiguous.</para>
  /// </remarks>
  [JsonPropertyOrder(6)]
  public AllergenAssessment? AllergenAssessment { get; set; }

  /// <summary>Mutable operational metadata (editing state, completion state, soft delete flag).</summary>
  /// <remarks><para>Soft-deleted products remain embedded for audit; parent invoice filters them out at presentation layers.</para></remarks>
  [JsonPropertyOrder(7)]
  public ProductMetadata Metadata { get; set; }

}
