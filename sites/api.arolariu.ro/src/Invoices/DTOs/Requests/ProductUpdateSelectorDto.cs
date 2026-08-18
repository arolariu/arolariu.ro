namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Transport selector for deterministically locating one identity-free invoice product before a mutation.
/// </summary>
/// <remarks>
/// <para>
/// A nonblank <see cref="OriginalProductCode"/> has precedence. Otherwise, the original name, quantity,
/// unit price, and total price form an immutable composite snapshot. If that snapshot still identifies
/// multiple products, <see cref="OccurrenceOrdinal"/> selects one in invoice collection order.
/// </para>
/// <para>
/// The selector is consumed only during the request mutation. It is never persisted on <see cref="Product"/>
/// and does not create a product identifier.
/// </para>
/// </remarks>
/// <param name="OriginalProductCode">The original product code, when nonblank.</param>
/// <param name="OriginalName">The original product name for composite matching.</param>
/// <param name="OriginalQuantity">The original non-negative quantity for composite matching.</param>
/// <param name="OriginalUnitPrice">The original non-negative unit price for composite matching.</param>
/// <param name="OriginalTotalPrice">The original non-negative total price for composite matching.</param>
/// <param name="OccurrenceOrdinal">The optional non-negative occurrence among matching products.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ProductUpdateSelectorDto(
  string? OriginalProductCode,
  string? OriginalName,
  [Range(typeof(decimal), "0", "79228162514264337593543950335")] decimal? OriginalQuantity,
  [Range(typeof(decimal), "0", "79228162514264337593543950335")] decimal? OriginalUnitPrice,
  [Range(typeof(decimal), "0", "79228162514264337593543950335")] decimal? OriginalTotalPrice,
  [Range(0, int.MaxValue)] int? OccurrenceOrdinal)
{
  /// <summary>
  /// Converts this transport selector to the transient domain selector used by processing mutations.
  /// </summary>
  /// <returns>The identity-free selector for one product mutation operation.</returns>
  public ProductUpdateSelector ToDomainSelector() => new(
    OriginalProductCode,
    OriginalName,
    OriginalQuantity,
    OriginalUnitPrice,
    OriginalTotalPrice,
    OccurrenceOrdinal);
}
