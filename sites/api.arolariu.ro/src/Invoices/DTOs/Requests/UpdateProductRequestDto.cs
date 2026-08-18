namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Request DTO for updating client-editable fields of an existing product within an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Corrects OCR and commercial fields after manual review without
/// replacing server-owned analysis or workflow state.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Product Identification:</b> Products within an invoice are identified by their
/// normalized <see cref="OriginalProductName"/>. Duplicate names are selected FIFO in
/// invoice collection order, and the selected persisted item is mutated in place.
/// </para>
/// <para>
/// <b>Preservation:</b> Allergen assessments, analysis metadata, workflow flags, and
/// a classification not explicitly replaced by a manual selection remain unchanged.
/// </para>
/// </remarks>
/// <param name="OriginalProductName">
/// The current name of the product to update. Required.
/// Used to locate the product within the invoice's item collection.
/// </param>
/// <param name="Name">
/// The new name for the product. Required.
/// May be the same as <see cref="OriginalProductName"/> if only other fields change.
/// </param>
/// <param name="Classification">
/// The optional new manual GPC classification selection. Null retains the persisted canonical
/// classification and its analysis evidence.
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

/// <example>
/// <code>
/// // Fix OCR error in product name and price
/// var request = new UpdateProductRequestDto(
///     OriginalProductName: "LAPTE ZU2U 1L",  // OCR misread
///     Name: "LAPTE ZUZU 1L",                 // Corrected
///     Classification: new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "10000025"),
///     Quantity: 2,
///     QuantityUnit: "buc",
///     ProductCode: "5941234567890",
///     Price: 8.99m);
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
  [Required] string Name,
  ClassificationSelectionDto? Classification,
  decimal Quantity,
  string? QuantityUnit,
  string? ProductCode,
  decimal Price)
{
  /// <summary>
  /// Converts this DTO to the client-editable portion of a <see cref="Product"/> update.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Note:</b> The <see cref="OriginalProductName"/> is not included in the
  /// returned product—it is only used for deterministic identification during the update operation.
  /// </para>
  /// <para>
  /// <b>Null Handling:</b> Optional string fields are converted to empty strings.
  /// Optional collections default to empty enumerables.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A transient <see cref="Product"/> carrying only client-editable update values.
  /// </returns>
  public Product ToProduct() => new()
  {
    Name = Name,
    Classification = Classification?.ToManualSelection(),
    Quantity = Quantity,
    QuantityUnit = QuantityUnit ?? string.Empty,
    ProductCode = ProductCode ?? string.Empty,
    Price = Price,
  };
}
