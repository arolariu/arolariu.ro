namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when attempting to create a merchant with an identifier that already exists in the data store (Cosmos HTTP 409).
/// </summary>
/// <remarks>
/// Implements <see cref="IAlreadyExistsException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 409 Conflict when this exception is surfaced, whether unwrapped or wrapped by a higher-layer outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class MerchantAlreadyExistsException : Exception, IAlreadyExistsException
{
  /// <summary>Initializes a new instance of the <see cref="MerchantAlreadyExistsException"/> class.</summary>
  public MerchantAlreadyExistsException() { }

  /// <summary>Initializes a new instance of the <see cref="MerchantAlreadyExistsException"/> class with the specified merchant identifier.</summary>
  /// <param name="merchantIdentifier">The identifier of the merchant that already exists.</param>
  public MerchantAlreadyExistsException(Guid merchantIdentifier)
  : base($"Merchant with identifier '{merchantIdentifier}' already exists.")
  {
    MerchantIdentifier = merchantIdentifier;
  }

  /// <summary>Initializes a new instance of the <see cref="MerchantAlreadyExistsException"/> class with the specified merchant identifier and inner exception.</summary>
  /// <param name="merchantIdentifier">The identifier of the merchant that already exists.</param>
  /// <param name="innerException">The inner exception.</param>
  public MerchantAlreadyExistsException(Guid merchantIdentifier, Exception innerException)
  : base($"Merchant with identifier '{merchantIdentifier}' already exists.", innerException)
  {
    MerchantIdentifier = merchantIdentifier;
  }

  /// <summary>Initializes a new instance of the <see cref="MerchantAlreadyExistsException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public MerchantAlreadyExistsException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="MerchantAlreadyExistsException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public MerchantAlreadyExistsException(string message, Exception innerException)
  : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private MerchantAlreadyExistsException(SerializationInfo info, StreamingContext context)
  : base(info, context) { }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the identifier of the merchant that already exists.</summary>
  public Guid MerchantIdentifier { get; }
}
