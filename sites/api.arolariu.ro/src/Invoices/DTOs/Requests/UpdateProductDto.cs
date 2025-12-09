namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Data transfer object for updating an existing product within an invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Full replacement of a product's data. Identified by <see cref="OriginalProductName"/>.</para>
/// <para><b>Conversion:</b> Use <see cref="ToProduct"/> to convert to the domain <see cref="Product"/> value object.</para>
/// <para><b>Identification:</b> Products are identified by their raw name within an invoice's item collection.</para>
/// </remarks>
/// <param name="OriginalProductName">The current name of the product to update (used for identification).</param>
/// <param name="RawName">The new raw OCR-extracted name.</param>
/// <param name="GenericName">The new normalized semantic label.</param>
/// <param name="Category">The product category classification.</param>
/// <param name="Quantity">The quantity of product units.</param>
/// <param name="QuantityUnit">The unit of measure (e.g., "kg", "ml", "pcs").</param>
/// <param name="ProductCode">Optional SKU or barcode identifier.</param>
/// <param name="Price">The unit price of the product.</param>
/// <param name="DetectedAllergens">Collection of detected allergens.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateProductDto(
  [Required] string OriginalProductName,
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
  /// <returns>A new <see cref="Product"/> instance with the updated values.</returns>
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
