namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;

/// <summary>
/// Represents an invoice classification selection that violates invoice taxonomy rules.
/// </summary>
public sealed class InvoiceClassificationNotValidException : Exception
{
  /// <summary>Initializes an empty validation exception.</summary>
  public InvoiceClassificationNotValidException()
  {
  }

  /// <summary>Initializes the exception with a validation message.</summary>
  /// <param name="message">The validation failure.</param>
  public InvoiceClassificationNotValidException(string message) : base(message)
  {
  }

  /// <summary>Initializes the exception with a validation message and underlying failure.</summary>
  /// <param name="message">The validation failure.</param>
  /// <param name="innerException">The underlying failure.</param>
  public InvoiceClassificationNotValidException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
