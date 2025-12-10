namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
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
/// <b>Dual Names:</b> <see cref="RawName"/> preserves the OCR-extracted text exactly
/// as it appears on the invoice, while <see cref="GenericName"/> provides a normalized
/// semantic label useful for cross-invoice aggregation and analytics.
/// </para>
/// <para>
/// <b>Computed Fields:</b> <see cref="TotalPrice"/> is computed as
/// <c>Quantity × Price</c> and stored for consistency.
/// </para>
/// <para>
/// <b>Allergen Detection:</b> The <see cref="DetectedAllergens"/> collection is
/// populated by AI analysis and may include common allergens like gluten, lactose,
/// nuts, etc.
/// </para>
/// </remarks>
/// <param name="RawName">
/// Raw OCR-extracted name exactly as it appears on the invoice scan.
/// Preserves original formatting, typos, and abbreviations for audit purposes.
/// </param>
/// <param name="GenericName">
/// Normalized semantic label for the product (e.g., "Milk 1L" instead of "MLK 1.0L").
/// Used for cross-invoice aggregation, reporting, and analytics.
/// </param>
/// <param name="Category">
/// Product category classification (e.g., Dairy, Meat, Beverages).
/// Defaults to <see cref="ProductCategory.NOT_DEFINED"/> if AI classification was not performed.
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
/// <param name="DetectedAllergens">
/// Collection of allergens detected by AI analysis. Common values include:
/// Gluten, Lactose, Nuts, Eggs, Soy, Fish, Shellfish.
/// Empty collection if no allergens detected or analysis not performed.
/// </param>
/// <param name="IsEdited">
/// Flag indicating the product data has been manually modified after initial ingestion.
/// True if user corrections were applied.
/// </param>
/// <param name="IsComplete">
/// Flag indicating all required product data is present and validated.
/// False if missing critical fields like name or price.
/// </param>
/// <param name="IsDeleted">
/// Flag indicating soft deletion status. Soft-deleted products are excluded from
/// totals but retained for audit history.
/// </param>
/// <example>
/// <code>
/// // Converting from domain value object
/// Product domainProduct = invoice.Items.First();
/// ProductResponseDto dto = ProductResponseDto.FromProduct(domainProduct);
///
/// // Displaying product info
/// Console.WriteLine($"{dto.GenericName}: {dto.Quantity} {dto.QuantityUnit} @ {dto.Price:C}");
/// Console.WriteLine($"Total: {dto.TotalPrice:C}");
/// if (dto.DetectedAllergens.Any())
///     Console.WriteLine($"Allergens: {string.Join(", ", dto.DetectedAllergens)}");
/// </code>
/// </example>
/// <seealso cref="Product"/>
/// <seealso cref="ProductCategory"/>
/// <seealso cref="Allergen"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ProductResponseDto(
  string RawName,
  string GenericName,
  ProductCategory Category,
  decimal Quantity,
  string QuantityUnit,
  string ProductCode,
  decimal Price,
  decimal TotalPrice,
  IReadOnlyCollection<Allergen> DetectedAllergens,
  bool IsEdited,
  bool IsComplete,
  bool IsDeleted)
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
  /// <b>Allergen Collection:</b> If the source allergens collection is already
  /// <see cref="IReadOnlyCollection{T}"/>, it is used directly. Otherwise, a new
  /// read-only list is created for immutability.
  /// </para>
  /// <para>
  /// <b>Metadata Extraction:</b> The <see cref="IsEdited"/>, <see cref="IsComplete"/>,
  /// and <see cref="IsDeleted"/> flags are extracted from the product's metadata.
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
      RawName: product.RawName,
      GenericName: product.GenericName,
      Category: product.Category,
      Quantity: product.Quantity,
      QuantityUnit: product.QuantityUnit,
      ProductCode: product.ProductCode,
      Price: product.Price,
      TotalPrice: product.TotalPrice,
      DetectedAllergens: product.DetectedAllergens is IReadOnlyCollection<Allergen> readOnly
        ? readOnly
        : new List<Allergen>(product.DetectedAllergens).AsReadOnly(),
      IsEdited: product.Metadata.IsEdited,
      IsComplete: product.Metadata.IsComplete,
      IsDeleted: product.Metadata.IsSoftDeleted);
  }
}
