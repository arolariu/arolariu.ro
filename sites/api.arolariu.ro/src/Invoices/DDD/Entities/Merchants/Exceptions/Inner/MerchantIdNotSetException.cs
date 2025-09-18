namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Merchant Identifier not set Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class MerchantIdNotSetException : Exception
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantIdNotSetException"/>
  /// </summary>
  /// <param name="innerException"></param>
  public MerchantIdNotSetException(Exception innerException)
    : base(
      message: "Merchant identifier not set Exception",
      innerException)
  {
  }

  /// <summary>
  /// Serialization constructor
  /// </summary>
  /// <param name="info"></param>
  /// <param name="context"></param>
  protected MerchantIdNotSetException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }

  /// <summary>
  /// Base constructor
  /// </summary>
  public MerchantIdNotSetException()
    : base()
  {
  }

  /// <summary>
  /// Constructor with message
  /// </summary>
  /// <param name="message"></param>
  protected MerchantIdNotSetException(string? message) : base(message)
  {
  }

  /// <summary>
  /// Constructor with message and inner exception
  /// </summary>
  /// <param name="message"></param>
  /// <param name="innerException"></param>
  protected MerchantIdNotSetException(string? message, Exception? innerException)
    : base(message, innerException)
  {
  }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
