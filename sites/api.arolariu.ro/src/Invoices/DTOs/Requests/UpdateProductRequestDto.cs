namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Request DTO for updating client-editable fields of one selected product within an invoice.
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
/// <b>Product Identification:</b> <see cref="Selector"/> deterministically identifies one
/// identity-free persisted product. It prefers the original product code, otherwise uses an
/// immutable commercial snapshot and, only where necessary, an occurrence ordinal.
/// </para>
/// <para>
/// <b>Preservation:</b> Allergen assessments, analysis metadata, workflow flags, and
/// a classification not explicitly replaced by a manual selection remain unchanged.
/// </para>
/// </remarks>
/// <param name="Selector">
/// The transient selector for the persisted product before client-editable fields are changed.
/// </param>
/// <param name="Name">
/// The new name for the product. Required.
/// May be the same as <see cref="Selector"/>'s original name if only other fields change.
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
///     Selector: new ProductUpdateSelectorDto(
///         OriginalProductCode: null,
///         OriginalName: "LAPTE ZU2U 1L",
///         OriginalQuantity: 2,
///         OriginalUnitPrice: 8.99m,
///         OriginalTotalPrice: 17.98m,
///         OccurrenceOrdinal: null),
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
  [Required] ProductUpdateSelectorDto? Selector,
  [Required] string Name,
  ClassificationSelectionDto? Classification,
  decimal Quantity,
  string? QuantityUnit,
  string? ProductCode,
  decimal Price)
{
  /// <summary>
  /// Initializes a legacy compatibility shape that identified products only by their original name.
  /// </summary>
  /// <param name="OriginalName">The original persisted product name used as a transient selector.</param>
  /// <param name="Name">The new product name.</param>
  /// <param name="Quantity">The new quantity.</param>
  /// <param name="QuantityUnit">The new quantity unit.</param>
  /// <param name="ProductCode">The new product code.</param>
  /// <param name="Price">The new unit price.</param>
  /// <param name="IgnoredCompatibilityPayload">Unused legacy payload retained only for compatibility.</param>
  public UpdateProductRequestDto(
    string OriginalName,
    string Name,
    decimal Quantity,
    string? QuantityUnit,
    string? ProductCode,
    decimal Price,
    IReadOnlyList<string>? IgnoredCompatibilityPayload)
    : this(
      Selector: new ProductUpdateSelectorDto(
        OriginalProductCode: null,
        OriginalName: OriginalName,
        OriginalQuantity: null,
        OriginalUnitPrice: null,
        OriginalTotalPrice: null,
        OccurrenceOrdinal: null),
      Name: Name,
      Classification: null,
      Quantity: Quantity,
      QuantityUnit: QuantityUnit,
      ProductCode: ProductCode,
      Price: Price)
  {
    _ = IgnoredCompatibilityPayload;
  }

  /// <summary>
  /// Converts this DTO's transient transport selector into the domain selector used during processing.
  /// </summary>
  /// <returns>The identity-free selector for one persisted product.</returns>
  /// <exception cref="ProductUpdateSelectorValidationException">
  /// Thrown when the request omits its required selector.
  /// </exception>
  public ProductUpdateSelector ToSelector() =>
    ValidateSelector();

  /// <summary>
  /// Converts this DTO to the client-editable portion of a <see cref="Product"/> update.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Note:</b> The selector is not included in the returned product—it is only used for
  /// deterministic identification during the update operation.
  /// </para>
  /// <para>
  /// <b>Null Handling:</b> Optional string fields are converted to empty strings.
  /// Optional collections default to empty enumerables.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A transient <see cref="Product"/> carrying only client-editable update values.
  /// </returns>
  public Product ToProduct()
  {
    if (Classification is { System: not ClassificationSystem.Gs1Gpc }
      || Classification is { Code: var code } && string.IsNullOrWhiteSpace(code))
    {
      throw new ProductValidationException(
        "Product classification must use the GS1 GPC system with a nonblank code.");
    }

    var product = new Product
    {
      Name = Name?.Trim() ?? string.Empty,
      Classification = Classification?.ToManualSelection(),
      Quantity = Quantity,
      QuantityUnit = QuantityUnit?.Trim() ?? string.Empty,
      ProductCode = ProductCode?.Trim() ?? string.Empty,
      Price = Price,
    };

    product.ValidateForPersistence();
    product.RequiresCommercialValidation = true;
    return product;
  }

  private ProductUpdateSelector ValidateSelector()
  {
    ProductUpdateSelector selector = Selector?.ToDomainSelector()
      ?? throw new ProductUpdateSelectorValidationException("A product update selector is required.");
    selector.Validate();
    return selector;
  }
}
