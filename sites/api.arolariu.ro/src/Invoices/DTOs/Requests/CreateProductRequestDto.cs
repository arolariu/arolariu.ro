namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Request DTO for adding a new product line item to an existing invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Enables manual addition of products to an invoice, useful for
/// correcting OCR errors or adding items that weren't automatically detected.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>AI Enrichment:</b> After creation, the product may be enriched by AI analysis
/// to populate classification and <see cref="DetectedAllergens"/> if not provided.
/// </para>
/// <para>
/// <b>Total Price:</b> The total price is computed automatically as
/// <c>Quantity × Price</c> during conversion to the domain object.
/// </para>
/// </remarks>
/// <param name="Name">
/// The product name as it appears on the receipt. Required.
/// This will be used as the product's display name.
/// </param>
/// <param name="Classification">
/// Optional manual GS1 GPC classification selection.
/// </param>
/// <param name="Quantity">
/// The quantity of product units. Must be positive.
/// Supports decimal for fractional quantities (e.g., 1.5 kg).
/// </param>
/// <param name="QuantityUnit">
/// The unit of measure (e.g., "kg", "L", "buc", "pcs").
/// Null if not specified; defaults to empty string in domain object.
/// </param>
/// <param name="ProductCode">
/// Optional SKU, barcode (EAN/UPC), or internal product identifier.
/// Null if not available on the receipt.
/// </param>
/// <param name="Price">
/// The unit price per single quantity. Currency is inherited from the parent invoice.
/// </param>
/// <param name="DetectedAllergens">
/// Optional collection of known allergens in this product.
/// May be populated by AI analysis if not provided.
/// </param>
/// <example>
/// <code>
/// var request = new CreateProductRequestDto(
///     Name: "Milk 1L (LAPTE ZUZU)",
///     Classification: null,
///     Quantity: 2,
///     QuantityUnit: "buc",
///     ProductCode: "5941234567890",
///     Price: 8.99m,
///     DetectedAllergens: [Allergen.Lactose]);
///
/// var product = request.ToProduct();
/// invoice.Items.Add(product);
/// </code>
/// </example>
/// <seealso cref="Product"/>
/// <seealso cref="ClassificationSelectionDto"/>
/// <seealso cref="Allergen"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateProductRequestDto(
  [Required] string Name,
  ClassificationSelectionDto? Classification,
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
  /// <b>Null Handling:</b> Optional string fields are converted to empty strings.
  /// Optional collections default to empty enumerables.
  /// </para>
  /// <para>
  /// <b>Total Price:</b> The <see cref="Product.TotalPrice"/> is computed
  /// automatically by the domain object as <c>Quantity × Price</c>.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A new <see cref="Product"/> instance initialized with the provided values.
  /// </returns>
  public Product ToProduct() => new()
  {
    Name = Name,
    Classification = null,
    PendingClassificationSelection = Classification?.ToSelection(),
    Quantity = Quantity,
    QuantityUnit = QuantityUnit ?? string.Empty,
    ProductCode = ProductCode ?? string.Empty,
    Price = Price,
    DetectedAllergens = DetectedAllergens ?? [],
  };
}
