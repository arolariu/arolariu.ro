namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// Represents a single invoice line item (product) enriched via OCR and AI classification pipelines.
/// </summary>
/// <remarks>
/// <para>Encapsulates raw OCR extracted token (<c>RawName</c>), a normalized semantic label (<c>GenericName</c>), categorical classification
/// (<c>Category</c>), quantitative details (<c>Quantity</c>, <c>QuantityUnit</c>), commercial identifiers (<c>ProductCode</c>), pricing
/// (<c>Price</c>, computed <c>TotalPrice</c>) and enrichment artifacts (<c>DetectedAllergens</c>, <c>Metadata</c>).</para>
/// <para><b>Lifecycle:</b> Instances are owned by the containing <see cref="Invoices"/> aggregate and are persisted as embedded documents
/// (Cosmos owned collection). They SHOULD NOT be shared across invoice aggregates.</para>
/// <para><b>Classification:</b> <c>Category</c> and <c>DetectedAllergens</c> may be progressively enriched; initial ingestion often sets
/// <c>Category = ProductCategory.NOT_DEFINED</c> and an empty allergen list.</para>
/// <para><b>Thread-safety:</b> Not thread-safe; mutate only within the aggregate’s modification workflow.</para>
/// </remarks>
[Owned]
[ExcludeFromCodeCoverage]
public class Product
{
  /// <summary>Raw OCR / extracted name as it appears on the physical or digital invoice.</summary>
  /// <remarks><para>Preserves original casing and formatting to support traceability / future reprocessing. Normalization occurs in <see cref="GenericName"/>.</para></remarks>
  [JsonPropertyOrder(0)]
  public string RawName { get; set; } = string.Empty;

  /// <summary>Normalized semantic label (e.g. from “MONSTER ENERGY DRINK 500ML” to “ENERGY DRINK”).</summary>
  /// <remarks><para>Used for aggregation, allergen inference heuristics and recipe matching. May be empty prior to enrichment.</para></remarks>
  [JsonPropertyOrder(1)]
  public string GenericName { get; set; } = string.Empty;

  /// <summary>Domain classification for the product.</summary>
  /// <remarks><para>Defaults to <see cref="ProductCategory.NOT_DEFINED"/> or <see cref="ProductCategory.OTHER"/> when enrichment has not resolved a concrete category.</para></remarks>
  [JsonPropertyOrder(2)]
  public ProductCategory Category { get; set; } = ProductCategory.OTHER;

  /// <summary>Quantity of the product associated with the unit indicated by <see cref="QuantityUnit"/>.</summary>
  /// <remarks><para>Must be non-negative. Zero often indicates an OCR failure and SHOULD be corrected upstream.</para></remarks>
  [JsonPropertyOrder(3)]
  public decimal Quantity { get; set; } = 0;

  /// <summary>Unit of measure for <see cref="Quantity"/> (e.g. "kg", "ml", "pcs").</summary>
  /// <remarks><para>Empty string denotes unspecified unit; downstream analytics may treat such entries as unit-less discrete counts.</para></remarks>
  [JsonPropertyOrder(4)]
  public string QuantityUnit { get; set; } = string.Empty;

  /// <summary>Optional SKU / barcode / internal product identifier.</summary>
  /// <remarks><para>Used for deterministic normalization where available. May be empty if not captured by OCR or invoice source.</para></remarks>
  [JsonPropertyOrder(5)]
  public string ProductCode { get; set; } = string.Empty;

  /// <summary>Unit price expressed in the parent invoice’s currency.</summary>
  /// <remarks>
  /// <para>Represents the effective per-unit value (post-discount if already applied upstream). Non-negative decimal. Range pricing or “per unit” expressions
  /// (e.g. “1.99 / kg”) are normalized prior to persistence; variability / ambiguity SHOULD be resolved in enrichment pipeline.</para>
  /// </remarks>
  [JsonPropertyOrder(6)]
  public decimal Price { get; set; } = 0;

  /// <summary>Computed extended line total (= <c>Quantity * Price</c>).</summary>
  /// <value>Zero when either quantity or price not yet enriched.</value>
  [JsonIgnore]
  public decimal TotalPrice => Quantity * Price;

  /// <summary>Detected / inferred allergens associated with this product.</summary>
  /// <remarks><para>List may be empty when not yet enriched. Duplicates SHOULD be avoided by upstream enrichment logic.</para></remarks>
  [JsonPropertyOrder(7)]
  public IEnumerable<Allergen> DetectedAllergens { get; set; } = [];

  /// <summary>Mutable operational metadata (editing state, completion state, soft delete flag).</summary>
  /// <remarks><para>Soft-deleted products remain embedded for audit; parent invoice filters them out at presentation layers.</para></remarks>
  [JsonPropertyOrder(8)]
  public ProductMetadata Metadata { get; set; }
}
