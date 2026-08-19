namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions.Inner;

using System;

/// <summary>
/// Represents a product classification selection that violates product taxonomy rules.
/// </summary>
public sealed class ProductClassificationNotValidException : Exception
{
  /// <summary>Initializes an empty validation exception.</summary>
  public ProductClassificationNotValidException()
  {
  }

  /// <summary>Initializes the exception with a validation message.</summary>
  /// <param name="message">The validation failure.</param>
  public ProductClassificationNotValidException(string message) : base(message)
  {
  }

  /// <summary>Initializes the exception with a validation message and underlying failure.</summary>
  /// <param name="message">The validation failure.</param>
  /// <param name="innerException">The underlying failure.</param>
  public ProductClassificationNotValidException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
