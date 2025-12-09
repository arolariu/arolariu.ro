namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Response DTO representing a product within an invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Provides a clean API contract for product data separate from the internal domain model.</para>
/// <para><b>Conversion:</b> Use <see cref="FromProduct(Product)"/> to create from a domain <see cref="Product"/>.</para>
/// <para><b>Computed Fields:</b> <see cref="TotalPrice"/> is computed as Quantity × Price.</para>
/// </remarks>
/// <param name="RawName">Raw OCR-extracted name as it appears on the invoice.</param>
/// <param name="GenericName">Normalized semantic label for aggregation.</param>
/// <param name="Category">Product category classification.</param>
/// <param name="Quantity">The quantity of product units.</param>
/// <param name="QuantityUnit">The unit of measure.</param>
/// <param name="ProductCode">Optional SKU or barcode identifier.</param>
/// <param name="Price">Unit price of the product.</param>
/// <param name="TotalPrice">Computed extended line total.</param>
/// <param name="DetectedAllergens">Collection of detected allergens.</param>
/// <param name="IsComplete">Whether the product data is complete.</param>
/// <param name="IsDeleted">Whether the product is soft-deleted.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ProductDto(
  string RawName,
  string GenericName,
  ProductCategory Category,
  decimal Quantity,
  string QuantityUnit,
  string ProductCode,
  decimal Price,
  decimal TotalPrice,
  IReadOnlyCollection<Allergen> DetectedAllergens,
  bool IsComplete,
  bool IsDeleted)
{
  /// <summary>
  /// Creates a <see cref="ProductDto"/> from a domain <see cref="Product"/>.
  /// </summary>
  /// <param name="product">The domain product to convert.</param>
  /// <returns>A DTO representing the product.</returns>
  public static ProductDto FromProduct(Product product)
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
      IsComplete: product.Metadata.IsComplete,
      IsDeleted: product.Metadata.IsSoftDeleted);
  }
}
