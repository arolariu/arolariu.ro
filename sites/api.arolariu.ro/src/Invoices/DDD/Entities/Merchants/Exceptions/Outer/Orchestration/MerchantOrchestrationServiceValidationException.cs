namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Merchant Orchestration Service Validation Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class MerchantOrchestrationServiceValidationException : Exception
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantOrchestrationServiceValidationException"/>
  /// </summary>
  /// <param name="innerException"></param>
  public MerchantOrchestrationServiceValidationException(Exception innerException)
    : base(
      message: "Merchant Orchestration Service Validation Exception",
      innerException)
  {
  }

  /// <summary>
  /// Serialization constructor
  /// </summary>
  /// <param name="info"></param>
  /// <param name="context"></param>
  protected MerchantOrchestrationServiceValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }

  /// <summary>
  /// Base constructor
  /// </summary>
  public MerchantOrchestrationServiceValidationException()
    : base()
  {
  }

  /// <summary>
  /// Constructor with message
  /// </summary>
  /// <param name="message"></param>
  protected MerchantOrchestrationServiceValidationException(string? message) : base(message)
  {
  }

  /// <summary>
  /// Constructor with message and inner exception
  /// </summary>
  /// <param name="message"></param>
  /// <param name="innerException"></param>
  protected MerchantOrchestrationServiceValidationException(string? message, Exception? innerException)
    : base(message, innerException)
  {
  }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
