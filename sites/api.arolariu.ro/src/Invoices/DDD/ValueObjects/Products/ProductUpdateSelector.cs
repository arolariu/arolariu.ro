namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

/// <summary>
/// Identifies one invoice product for a mutation without assigning persistent identity.
/// </summary>
/// <remarks>
/// <para>
/// A selector captures the product's immutable client-side snapshot before a mutation. A nonblank
/// <see cref="OriginalProductCode"/> is the strongest discriminator. If no such code exists, the
/// normalized name, quantity, unit price, and total price form the composite discriminator.
/// </para>
/// <para>
/// <see cref="OccurrenceOrdinal"/> distinguishes the remaining identical values in invoice
/// collection order. It is intentionally transient: it is never added to <see cref="Product"/>,
/// persisted, or used as an analysis correlation identity.
/// </para>
/// </remarks>
/// <param name="OriginalProductCode">The product code before the mutation, when the product had one.</param>
/// <param name="OriginalName">The product name before the mutation when selecting by composite snapshot.</param>
/// <param name="OriginalQuantity">The product quantity before the mutation when selecting by composite snapshot.</param>
/// <param name="OriginalUnitPrice">The product unit price before the mutation when selecting by composite snapshot.</param>
/// <param name="OriginalTotalPrice">The product total price before the mutation when selecting by composite snapshot.</param>
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

    if (UsesOriginalProductCode && !HasValidProductCode(OriginalProductCode!))
    {
      throw new ProductUpdateSelectorValidationException(
        "The original product code must be a safe identifier of at most 128 characters.");
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
          "A product selector requires an original product code or a complete original snapshot.");
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
  /// Selects exactly one persisted product from an invoice item collection.
  /// </summary>
  /// <remarks>
  /// Product-code precedence, composite-snapshot matching, duplicate ambiguity, and ordinal
  /// range validation are centralized here so every product mutation shares identical
  /// identity-free selection semantics.
  /// </remarks>
  /// <param name="products">The persisted product collection to inspect.</param>
  /// <param name="invoiceIdentifier">The owning invoice identifier used by typed errors.</param>
  /// <param name="matchingProductCount">Receives the number of products matched by the preferred discriminator.</param>
  /// <returns>The exact persisted product selected for the caller's mutation.</returns>
  /// <exception cref="ProductNotFoundException">
  /// Thrown when no persisted product satisfies this selector.
  /// </exception>
  /// <exception cref="ProductUpdateSelectorAmbiguousException">
  /// Thrown when multiple products match and no occurrence ordinal was supplied.
  /// </exception>
  /// <exception cref="ProductUpdateSelectorOccurrenceOutOfRangeException">
  /// Thrown when the supplied occurrence ordinal exceeds the matching products.
  /// </exception>
  internal Product SelectPersistedProduct(
    IEnumerable<Product> products,
    Guid invoiceIdentifier,
    out int matchingProductCount)
  {
    ArgumentNullException.ThrowIfNull(products);

    List<Product> matchedProducts = products
      .Where(product => product is not null && Matches(product))
      .ToList();
    matchingProductCount = matchedProducts.Count;

    if (matchingProductCount == 0)
    {
      throw new ProductNotFoundException(invoiceIdentifier);
    }

    if (OccurrenceOrdinal is int occurrenceOrdinal)
    {
      if (occurrenceOrdinal >= matchingProductCount)
      {
        throw new ProductUpdateSelectorOccurrenceOutOfRangeException(
          invoiceIdentifier,
          occurrenceOrdinal,
          matchingProductCount);
      }

      return matchedProducts[occurrenceOrdinal];
    }

    if (matchingProductCount > 1)
    {
      throw new ProductUpdateSelectorAmbiguousException(invoiceIdentifier, matchingProductCount);
    }

    return matchedProducts[0];
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

  private static bool HasValidProductCode(string productCode)
  {
    string normalizedProductCode = productCode.Trim();

    if (string.IsNullOrEmpty(normalizedProductCode) || normalizedProductCode.Length > 128)
    {
      return false;
    }

    foreach (char character in normalizedProductCode)
    {
      if (!char.IsAsciiLetterOrDigit(character)
        && character is not '.' and not '_' and not '-' and not '/')
      {
        return false;
      }
    }

    return true;
  }

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
