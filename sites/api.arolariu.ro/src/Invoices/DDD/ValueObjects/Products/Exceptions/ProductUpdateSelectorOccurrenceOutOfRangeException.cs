namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Thrown when a product update selector's occurrence ordinal is outside its matching set.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed class ProductUpdateSelectorOccurrenceOutOfRangeException : ProductUpdateSelectorValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorOccurrenceOutOfRangeException"/> class.
  /// </summary>
  public ProductUpdateSelectorOccurrenceOutOfRangeException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorOccurrenceOutOfRangeException"/> class.
  /// </summary>
  /// <param name="message">The occurrence-range failure description.</param>
  public ProductUpdateSelectorOccurrenceOutOfRangeException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorOccurrenceOutOfRangeException"/> class.
  /// </summary>
  /// <param name="message">The occurrence-range failure description.</param>
  /// <param name="innerException">The exception that caused the occurrence-range failure.</param>
  public ProductUpdateSelectorOccurrenceOutOfRangeException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorOccurrenceOutOfRangeException"/> class.
  /// </summary>
  /// <param name="invoiceIdentifier">The invoice containing the matched products.</param>
  /// <param name="occurrenceOrdinal">The requested zero-based occurrence ordinal.</param>
  /// <param name="matchingProductCount">The number of products matched by the selector.</param>
  public ProductUpdateSelectorOccurrenceOutOfRangeException(
    Guid invoiceIdentifier,
    int occurrenceOrdinal,
    int matchingProductCount)
    : base(
      $"Product occurrence ordinal '{occurrenceOrdinal}' is outside the {matchingProductCount} matching products "
      + $"in invoice '{invoiceIdentifier}'.")
  {
    InvoiceIdentifier = invoiceIdentifier;
    OccurrenceOrdinal = occurrenceOrdinal;
    MatchingProductCount = matchingProductCount;
  }

  /// <summary>
  /// Gets the invoice containing the matched products.
  /// </summary>
  public Guid InvoiceIdentifier { get; }

  /// <summary>
  /// Gets the requested zero-based occurrence ordinal.
  /// </summary>
  public int OccurrenceOrdinal { get; }

  /// <summary>
  /// Gets the number of products matched by the selector.
  /// </summary>
  public int MatchingProductCount { get; }
}
