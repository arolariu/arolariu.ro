namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;

/// <summary>
/// Represents a merchant classification selection that violates merchant taxonomy rules.
/// </summary>
public sealed class MerchantClassificationNotValidException : Exception
{
  /// <summary>Initializes an empty validation exception.</summary>
  public MerchantClassificationNotValidException()
  {
  }

  /// <summary>Initializes the exception with a validation message.</summary>
  /// <param name="message">The validation failure.</param>
  public MerchantClassificationNotValidException(string message) : base(message)
  {
  }

  /// <summary>Initializes the exception with a validation message and underlying failure.</summary>
  /// <param name="message">The validation failure.</param>
  /// <param name="innerException">The underlying failure.</param>
  public MerchantClassificationNotValidException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
