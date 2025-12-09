namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Data transfer object for creating a new product within an invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Adds a new product/line item to an existing invoice.</para>
/// <para><b>Conversion:</b> Use <see cref="ToProduct"/> to convert to the domain <see cref="Product"/> value object.</para>
/// <para><b>Enrichment:</b> Fields like <see cref="GenericName"/> and <see cref="DetectedAllergens"/> may be populated by AI enrichment.</para>
/// </remarks>
/// <param name="RawName">The raw OCR-extracted name as it appears on the receipt.</param>
/// <param name="GenericName">Optional normalized semantic label.</param>
/// <param name="Category">The product category classification.</param>
/// <param name="Quantity">The quantity of product units.</param>
/// <param name="QuantityUnit">The unit of measure (e.g., "kg", "ml", "pcs").</param>
/// <param name="ProductCode">Optional SKU or barcode identifier.</param>
/// <param name="Price">The unit price of the product.</param>
/// <param name="DetectedAllergens">Optional collection of detected allergens.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateProductRequestDto(
  [Required] string RawName,
  string? GenericName,
  ProductCategory Category,
  decimal Quantity,
  string? QuantityUnit,
  string? ProductCode,
  decimal Price,
  IEnumerable<Allergen>? DetectedAllergens)
{
  /// <summary>
  /// Converts this DTO to a <see cref="Product"/> domain value object.
  /// </summary>
  /// <returns>A new <see cref="Product"/> instance.</returns>
  public Product ToProduct() => new()
  {
    RawName = RawName,
    GenericName = GenericName ?? string.Empty,
    Category = Category,
    Quantity = Quantity,
    QuantityUnit = QuantityUnit ?? string.Empty,
    ProductCode = ProductCode ?? string.Empty,
    Price = Price,
    DetectedAllergens = DetectedAllergens ?? [],
  };
}
