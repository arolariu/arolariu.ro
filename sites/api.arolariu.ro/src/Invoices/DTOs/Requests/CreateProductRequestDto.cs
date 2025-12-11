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
/// to populate <see cref="GenericName"/>, <see cref="Category"/>, and
/// <see cref="DetectedAllergens"/> if not provided.
/// </para>
/// <para>
/// <b>Total Price:</b> The total price is computed automatically as
/// <c>Quantity × Price</c> during conversion to the domain object.
/// </para>
/// </remarks>
/// <param name="RawName">
/// The raw name as it appears on the receipt. Required.
/// Preserved for audit purposes even if <see cref="GenericName"/> is provided.
/// </param>
/// <param name="GenericName">
/// Optional normalized semantic label (e.g., "Milk 1L" instead of "MLK 1.0L").
/// If not provided, may be populated by AI enrichment.
/// </param>
/// <param name="Category">
/// The product category classification. Defaults to <see cref="ProductCategory.NOT_DEFINED"/>
/// if not specified. May be auto-classified by AI analysis.
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
///     RawName: "LAPTE ZUZU 1L",
///     GenericName: "Milk 1L",
///     Category: ProductCategory.DAIRY,
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
/// <seealso cref="ProductCategory"/>
/// <seealso cref="Allergen"/>
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
