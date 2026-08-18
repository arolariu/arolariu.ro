namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when a transient product update selector is structurally or numerically invalid.
/// </summary>
/// <remarks>
/// Implements <see cref="IValidationException"/> so selector failures are reported as caller-correctable
/// validation responses without introducing an identity on the persisted <see cref="Product"/>.
/// </remarks>
[ExcludeFromCodeCoverage]
public class ProductUpdateSelectorValidationException : Exception, IValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorValidationException"/> class.
  /// </summary>
  public ProductUpdateSelectorValidationException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorValidationException"/> class.
  /// </summary>
  /// <param name="message">The validation failure description.</param>
  public ProductUpdateSelectorValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductUpdateSelectorValidationException"/> class.
  /// </summary>
  /// <param name="message">The validation failure description.</param>
  /// <param name="innerException">The exception that caused the validation failure.</param>
  public ProductUpdateSelectorValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
