namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when a product line item violates a client-editable domain invariant.
/// </summary>
/// <remarks>
/// This marker-backed exception preserves a caller-correctable HTTP 400 classification through processing,
/// orchestration, and foundation exception wrapping.
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed class ProductValidationException : Exception, IValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductValidationException"/> class.
  /// </summary>
  public ProductValidationException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductValidationException"/> class.
  /// </summary>
  /// <param name="message">The safe client-facing invariant failure message.</param>
  public ProductValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductValidationException"/> class with a cause.
  /// </summary>
  /// <param name="message">The safe client-facing invariant failure message.</param>
  /// <param name="innerException">The exception that caused the invariant failure.</param>
  public ProductValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
