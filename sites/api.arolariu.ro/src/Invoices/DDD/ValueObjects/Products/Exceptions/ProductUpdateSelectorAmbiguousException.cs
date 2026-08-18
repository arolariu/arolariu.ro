namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Thrown when a product update selector matches multiple products without an occurrence ordinal.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed class ProductUpdateSelectorAmbiguousException : ProductUpdateSelectorValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorAmbiguousException"/> class.
  /// </summary>
  public ProductUpdateSelectorAmbiguousException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorAmbiguousException"/> class.
  /// </summary>
  /// <param name="message">The ambiguity description.</param>
  public ProductUpdateSelectorAmbiguousException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorAmbiguousException"/> class.
  /// </summary>
  /// <param name="message">The ambiguity description.</param>
  /// <param name="innerException">The exception that caused the ambiguity failure.</param>
  public ProductUpdateSelectorAmbiguousException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorAmbiguousException"/> class.
  /// </summary>
  /// <param name="invoiceIdentifier">The invoice containing the indistinguishable products.</param>
  /// <param name="matchingProductCount">The number of products matched by the selector.</param>
  public ProductUpdateSelectorAmbiguousException(Guid invoiceIdentifier, int matchingProductCount)
    : base(
      $"The product update selector matched {matchingProductCount} products in invoice '{invoiceIdentifier}'. "
      + "Provide a zero-based occurrence ordinal.")
  {
    InvoiceIdentifier = invoiceIdentifier;
    MatchingProductCount = matchingProductCount;
  }

  /// <summary>
  /// Gets the invoice containing the indistinguishable products.
  /// </summary>
  public Guid InvoiceIdentifier { get; }

  /// <summary>
  /// Gets the number of products matched by the selector.
  /// </summary>
  public int MatchingProductCount { get; }
}
