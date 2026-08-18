namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

/// <summary>
/// Identifies one mutable invoice product without assigning a persistent product identity.
/// </summary>
/// <remarks>
/// <para>
/// A selector captures the product's immutable client-side snapshot before an edit. A nonblank
/// <see cref="OriginalProductCode"/> is the strongest discriminator. If no such code exists, the
/// normalized name, quantity, unit price, and total price form the composite discriminator.
/// </para>
/// <para>
/// <see cref="OccurrenceOrdinal"/> distinguishes the remaining identical values in invoice
/// collection order. It is intentionally transient: it is never added to <see cref="Product"/>,
/// persisted, or used as an analysis correlation identity.
/// </para>
/// </remarks>
/// <param name="OriginalProductCode">The product code before the edit, when the product had one.</param>
/// <param name="OriginalName">The product name before the edit when selecting by composite snapshot.</param>
/// <param name="OriginalQuantity">The product quantity before the edit when selecting by composite snapshot.</param>
/// <param name="OriginalUnitPrice">The product unit price before the edit when selecting by composite snapshot.</param>
/// <param name="OriginalTotalPrice">The product total price before the edit when selecting by composite snapshot.</param>
/// <param name="OccurrenceOrdinal">The zero-based occurrence among currently matching products, when needed.</param>
public sealed record ProductUpdateSelector(
  string? OriginalProductCode,
  string? OriginalName,
  decimal? OriginalQuantity,
  decimal? OriginalUnitPrice,
  decimal? OriginalTotalPrice,
  int? OccurrenceOrdinal)
{
  /// <summary>
  /// Gets whether a nonblank original product code selects the product.
  /// </summary>
  internal bool UsesOriginalProductCode => !string.IsNullOrWhiteSpace(OriginalProductCode);

  /// <summary>
  /// Validates the selector before an invoice aggregate is loaded.
  /// </summary>
  /// <exception cref="ProductUpdateSelectorValidationException">
  /// Thrown when the selector has no usable discriminator or contains an invalid numeric snapshot.
  /// </exception>
  internal void Validate()
  {
    if (OccurrenceOrdinal is < 0)
    {
      throw new ProductUpdateSelectorValidationException(
        "The product occurrence ordinal must be a non-negative integer.");
    }

    bool containsAnySnapshotValue =
      OriginalName is not null
      || OriginalQuantity.HasValue
      || OriginalUnitPrice.HasValue
      || OriginalTotalPrice.HasValue;

    if (!containsAnySnapshotValue)
    {
      if (!UsesOriginalProductCode)
      {
        throw new ProductUpdateSelectorValidationException(
          "A product update selector requires an original product code or a complete original snapshot.");
      }

      return;
    }

    if (string.IsNullOrWhiteSpace(OriginalName)
      || !OriginalQuantity.HasValue
      || !OriginalUnitPrice.HasValue
      || !OriginalTotalPrice.HasValue)
    {
      throw new ProductUpdateSelectorValidationException(
        "An original product snapshot requires name, quantity, unit price, and total price.");
    }

    if (OriginalQuantity.Value < decimal.Zero
      || OriginalUnitPrice.Value < decimal.Zero
      || OriginalTotalPrice.Value < decimal.Zero)
    {
      throw new ProductUpdateSelectorValidationException(
        "Original product quantity, unit price, and total price must be non-negative.");
    }

    try
    {
      if (OriginalQuantity.Value * OriginalUnitPrice.Value != OriginalTotalPrice.Value)
      {
        throw new ProductUpdateSelectorValidationException(
          "Original product total price must equal original quantity multiplied by original unit price.");
      }
    }
    catch (OverflowException exception)
    {
      throw new ProductUpdateSelectorValidationException(
        "Original product quantity and unit price are outside the supported numeric range.",
        exception);
    }
  }

  /// <summary>
  /// Determines whether a persisted product satisfies this selector's preferred discriminator.
  /// </summary>
  /// <param name="product">The persisted product to evaluate.</param>
  /// <returns><see langword="true"/> when the product matches the preferred discriminator.</returns>
  internal bool Matches(Product product)
  {
    ArgumentNullException.ThrowIfNull(product);

    if (UsesOriginalProductCode)
    {
      return string.Equals(
        NormalizeProductCode(product.ProductCode),
        NormalizeProductCode(OriginalProductCode),
        StringComparison.Ordinal);
    }

    return string.Equals(NormalizeName(product.Name), NormalizeName(OriginalName), StringComparison.Ordinal)
      && product.Quantity == OriginalQuantity
      && product.Price == OriginalUnitPrice
      && product.TotalPrice == OriginalTotalPrice;
  }

  /// <summary>
  /// Normalizes a product code for ordinal, whitespace-insensitive comparison.
  /// </summary>
  /// <param name="productCode">The product code to normalize.</param>
  /// <returns>The normalized product code, or an empty string when absent.</returns>
  private static string NormalizeProductCode(string? productCode) =>
    string.IsNullOrWhiteSpace(productCode)
      ? string.Empty
      : productCode.Trim().ToUpperInvariant();

  /// <summary>
  /// Normalizes a product name for deterministic composite-snapshot comparison.
  /// </summary>
  /// <param name="name">The product name to normalize.</param>
  /// <returns>The uppercase name with collapsed whitespace.</returns>
  private static string NormalizeName(string? name) =>
    string.IsNullOrWhiteSpace(name)
      ? string.Empty
      : string.Join(
        ' ',
        name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
      .ToUpperInvariant();
}
