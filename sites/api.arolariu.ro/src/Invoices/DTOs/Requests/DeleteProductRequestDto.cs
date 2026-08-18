namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

/// <summary>
/// Request DTO for removing a product line item from an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Product Identification:</b> <see cref="Selector"/> deterministically identifies one
/// identity-free persisted product. It prefers the original product code, otherwise uses an
/// immutable commercial snapshot and, only where necessary, an occurrence ordinal.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// </remarks>
/// <param name="Selector">
/// The transient selector for the persisted product before it is removed.
/// </param>
/// <example>
/// <code>
/// // Remove the second otherwise-identical product.
/// var request = new DeleteProductRequestDto(
///   Selector: new ProductUpdateSelectorDto(
///     OriginalProductCode: null,
///     OriginalName: "LAPTE ZUZU 1L",
///     OriginalQuantity: 2,
///     OriginalUnitPrice: 8.99m,
///     OriginalTotalPrice: 17.98m,
///     OccurrenceOrdinal: 1));
///
/// // Service layer handles the actual deletion
/// await invoiceService.DeleteProductAsync(invoiceId, request);
/// </code>
/// </example>
/// <seealso cref="CreateProductRequestDto"/>
/// <seealso cref="UpdateProductRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct DeleteProductRequestDto(
  [Required] ProductUpdateSelectorDto? Selector)
{
  /// <summary>
  /// Converts this DTO's transient transport selector into the domain selector used during processing.
  /// </summary>
  /// <returns>The identity-free selector for one persisted product.</returns>
  /// <exception cref="ProductUpdateSelectorValidationException">
  /// Thrown when the request omits its required selector.
  /// </exception>
  public ProductUpdateSelector ToSelector() =>
    Selector?.ToDomainSelector()
      ?? throw new ProductUpdateSelectorValidationException("A product deletion selector is required.");
}
