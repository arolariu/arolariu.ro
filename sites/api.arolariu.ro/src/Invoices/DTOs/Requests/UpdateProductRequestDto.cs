namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Request DTO for replacing an existing product within an invoice (PUT semantics).
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Enables full replacement of a product's data, typically used to
/// correct OCR errors or update product information after manual review.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Product Identification:</b> Products within an invoice are identified by their
/// <see cref="OriginalProductName"/>. The update replaces the entire product data
/// while maintaining its position in the invoice's item collection.
/// </para>
/// <para>
/// <b>Metadata Flag:</b> When a product is updated via this DTO, its
/// <c>Metadata.IsEdited</c> flag is set to <c>true</c> to track manual modifications.
/// </para>
/// </remarks>
/// <param name="OriginalProductName">
/// The current raw name of the product to update. Required.
/// Used to locate the product within the invoice's item collection.
/// </param>
/// <param name="RawName">
/// The new raw name for the product. Required.
/// May be the same as <see cref="OriginalProductName"/> if only other fields change.
/// </param>
/// <param name="GenericName">
/// The new normalized semantic label. Null becomes empty string.
/// </param>
/// <param name="Category">
/// The product category classification. Replaces the existing category.
/// </param>
/// <param name="Quantity">
/// The new quantity of product units. Must be positive.
/// </param>
/// <param name="QuantityUnit">
/// The new unit of measure. Null becomes empty string.
/// </param>
/// <param name="ProductCode">
/// The new SKU or barcode identifier. Null becomes empty string.
/// </param>
/// <param name="Price">
/// The new unit price. Total price is recomputed as <c>Quantity × Price</c>.
/// </param>
/// <param name="DetectedAllergens">
/// The new collection of detected allergens. Null becomes empty collection.
/// </param>
/// <example>
/// <code>
/// // Fix OCR error in product name and price
/// var request = new UpdateProductRequestDto(
///     OriginalProductName: "LAPTE ZU2U 1L",  // OCR misread
///     RawName: "LAPTE ZUZU 1L",              // Corrected
///     GenericName: "Milk 1L",
///     Category: ProductCategory.DAIRY,
///     Quantity: 2,
///     QuantityUnit: "buc",
///     ProductCode: "5941234567890",
///     Price: 8.99m,
///     DetectedAllergens: [Allergen.Lactose]);
///
/// var updatedProduct = request.ToProduct();
/// </code>
/// </example>
/// <seealso cref="Product"/>
/// <seealso cref="CreateProductRequestDto"/>
/// <seealso cref="DeleteProductRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateProductRequestDto(
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
  /// <remarks>
  /// <para>
  /// <b>Note:</b> The <see cref="OriginalProductName"/> is not included in the
  /// returned product—it is only used for identification during the update operation.
  /// </para>
  /// <para>
  /// <b>Null Handling:</b> Optional string fields are converted to empty strings.
  /// Optional collections default to empty enumerables.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A new <see cref="Product"/> instance with the updated values.
  /// </returns>
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
