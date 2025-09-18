namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Merchant Foundation Service Dependency Validation Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class MerchantFoundationServiceDependencyValidationException : Exception
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantFoundationServiceDependencyValidationException"/>
  /// </summary>
  /// <param name="innerException"></param>
  public MerchantFoundationServiceDependencyValidationException(Exception innerException)
    : base(
      message: "Merchant Foundation Service Dependency Validation Exception",
      innerException)
  {
  }

  /// <summary>
  /// Serialization constructor
  /// </summary>
  /// <param name="info"></param>
  /// <param name="context"></param>
  protected MerchantFoundationServiceDependencyValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }

  /// <summary>
  /// Base constructor
  /// </summary>
  public MerchantFoundationServiceDependencyValidationException()
    : base()
  {
  }

  /// <summary>
  /// Constructor with message
  /// </summary>
  /// <param name="message"></param>
  protected MerchantFoundationServiceDependencyValidationException(string? message) : base(message)
  {
  }

  /// <summary>
  /// Constructor with message and inner exception
  /// </summary>
  /// <param name="message"></param>
  /// <param name="innerException"></param>
  protected MerchantFoundationServiceDependencyValidationException(string? message, Exception? innerException)
    : base(message, innerException)
  {
  }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
