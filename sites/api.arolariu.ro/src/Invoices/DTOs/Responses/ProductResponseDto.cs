namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Response DTO representing a line item product within an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Provides a clean API contract for product/line item data,
/// fully decoupled from the internal <see cref="Product"/> domain value object.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Product Name:</b> <see cref="Name"/> contains the product name as extracted
/// from the invoice via OCR, used for display, aggregation, and analytics.
/// </para>
/// <para>
/// <b>Computed Fields:</b> <see cref="TotalPrice"/> is computed as
/// <c>Quantity × Price</c> and stored for consistency.
/// </para>
/// <para>
/// <b>Allergen Detection:</b> The <see cref="AllergenAssessment"/> section is
/// populated by analysis runs and may include common allergens like gluten, lactose,
/// nuts, etc.
/// </para>
/// </remarks>
/// <param name="Name">
/// The name of the product as extracted from the invoice via OCR.
/// Used for display, aggregation, allergen inference heuristics and recipe matching.
/// </param>
/// <param name="Classification">
/// The standardised GPC classification assigned to this line item.
/// Null when the line item has not been classified yet.
/// </param>
/// <param name="Quantity">
/// The quantity of product units purchased. Always positive.
/// Decimal to support fractional quantities (e.g., 1.5 kg of produce).
/// </param>
/// <param name="QuantityUnit">
/// The unit of measure (e.g., "kg", "L", "buc", "pcs").
/// May vary based on invoice origin and OCR extraction.
/// </param>
/// <param name="ProductCode">
/// Optional SKU, barcode (EAN/UPC), or internal product code.
/// Empty string if not present on the invoice.
/// </param>
/// <param name="Price">
/// Unit price per single quantity unit. Currency is determined by the parent invoice.
/// </param>
/// <param name="TotalPrice">
/// Computed extended line total (<c>Quantity × Price</c>).
/// May differ slightly from simple multiplication due to rounding on the original invoice.
/// </param>
/// <param name="AllergenAssessment">
/// The structured allergen assessment produced by an analysis run. Common signals include:
/// Gluten, Lactose, Nuts, Eggs, Soy, Fish, Shellfish.
/// Null when no allergen assessment has been produced yet. An assessment carries its own status,
/// so an empty signal list is never ambiguous.
/// </param>
/// <param name="Metadata">
/// Nested metadata containing edit status, completeness, soft-deletion flag,
/// and OCR confidence score. Preserves 1:1 parity with frontend ProductMetadata type.
/// </param>
/// <example>
/// <code>
/// // Converting from domain value object
/// Product domainProduct = invoice.Items.First();
/// ProductResponseDto dto = ProductResponseDto.FromProduct(domainProduct);
///
/// // Displaying product info
/// Console.WriteLine($"{dto.Name}: {dto.Quantity} {dto.QuantityUnit} @ {dto.Price:C}");
/// Console.WriteLine($"Total: {dto.TotalPrice:C}");
/// if (dto.AllergenAssessment is not null)
///     Console.WriteLine($"Allergens: {dto.AllergenAssessment.Status}");
/// </code>
/// </example>
/// <seealso cref="Product"/>
/// <seealso cref="StandardClassification"/>
/// <seealso cref="AllergenAssessment"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ProductResponseDto(
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("classification")] StandardClassificationResponseDto? Classification,
  [property: JsonPropertyName("quantity")] decimal Quantity,
  [property: JsonPropertyName("quantityUnit")] string QuantityUnit,
  [property: JsonPropertyName("productCode")] string ProductCode,
  [property: JsonPropertyName("price")] decimal Price,
  [property: JsonPropertyName("totalPrice")] decimal TotalPrice,
  [property: JsonPropertyName("allergenAssessment")] AllergenAssessmentResponseDto? AllergenAssessment,
  [property: JsonPropertyName("metadata")] ProductMetadataDto Metadata)
{
  /// <summary>
  /// Creates a <see cref="ProductResponseDto"/> from a domain <see cref="Product"/> value object.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Factory Pattern:</b> Preferred method for creating DTOs from domain objects.
  /// Ensures consistent mapping and proper handling of collection types.
  /// </para>
  /// <para>
  /// <b>Allergen Assessment:</b> The immutable assessment value object is passed through by
  /// reference; it is already a snapshot and cannot be mutated by callers.
  /// </para>
  /// <para>
  /// <b>Metadata:</b> The product's <see cref="ProductMetadataDto"/> is preserved as a nested
  /// structure for 1:1 parity with the frontend TypeScript type.
  /// </para>
  /// </remarks>
  /// <param name="product">
  /// The domain product value object to convert. Must not be null.
  /// </param>
  /// <returns>
  /// A new <see cref="ProductResponseDto"/> instance with all fields mapped.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="product"/> is null.
  /// </exception>
  public static ProductResponseDto FromProduct(Product product)
  {
    ArgumentNullException.ThrowIfNull(product);
    return new(
      Name: product.Name,
      Classification: StandardClassificationResponseDto.FromStandardClassification(product.Classification),
      Quantity: product.Quantity,
      QuantityUnit: product.QuantityUnit,
      ProductCode: product.ProductCode,
      Price: product.Price,
      TotalPrice: product.TotalPrice,
      AllergenAssessment: AllergenAssessmentResponseDto.FromAllergenAssessment(product.AllergenAssessment),
      Metadata: new ProductMetadataDto(
        IsEdited: product.Metadata.IsEdited,
        IsComplete: product.Metadata.IsComplete,
        IsSoftDeleted: product.Metadata.IsSoftDeleted,
        Confidence: product.Metadata.Confidence));
  }
}

/// <summary>
/// Nested metadata DTO preserving 1:1 parity with the frontend ProductMetadata type.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ProductMetadataDto(
  [property: JsonPropertyName("isEdited")] bool IsEdited,
  [property: JsonPropertyName("isComplete")] bool IsComplete,
  [property: JsonPropertyName("isSoftDeleted")] bool IsSoftDeleted,
  [property: JsonPropertyName("confidence")] double Confidence);
