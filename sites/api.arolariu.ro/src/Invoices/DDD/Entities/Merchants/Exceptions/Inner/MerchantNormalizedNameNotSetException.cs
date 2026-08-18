namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when a deterministic merchant-resolution request omits the normalized merchant name.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class MerchantNormalizedNameNotSetException : Exception
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantNormalizedNameNotSetException"/> class.
  /// </summary>
  public MerchantNormalizedNameNotSetException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantNormalizedNameNotSetException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The exception describing the invalid input.</param>
  public MerchantNormalizedNameNotSetException(Exception innerException)
    : base("Merchant normalized name was not provided.", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantNormalizedNameNotSetException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public MerchantNormalizedNameNotSetException(string? message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantNormalizedNameNotSetException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public MerchantNormalizedNameNotSetException(string? message, Exception? innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private MerchantNormalizedNameNotSetException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
