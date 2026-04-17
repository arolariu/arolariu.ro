namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

using System;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Merchant Orchestration Service Dependency Validation Exception
/// </summary>
[Serializable]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class MerchantOrchestrationServiceDependencyValidationException : Exception, IDependencyValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantOrchestrationServiceDependencyValidationException"/>
  /// </summary>
  /// <param name="innerException"></param>
  public MerchantOrchestrationServiceDependencyValidationException(Exception innerException)
    : base(
      message: "Merchant Orchestration Service Dependency Validation Exception",
      innerException)
  {
  }

  /// <summary>
  /// Serialization constructor
  /// </summary>
  /// <param name="info"></param>
  /// <param name="context"></param>
  protected MerchantOrchestrationServiceDependencyValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }

  /// <summary>
  /// Base constructor
  /// </summary>
  public MerchantOrchestrationServiceDependencyValidationException()
    : base()
  {
  }

  /// <summary>
  /// Constructor with message
  /// </summary>
  /// <param name="message"></param>
  protected MerchantOrchestrationServiceDependencyValidationException(string? message) : base(message)
  {
  }

  /// <summary>
  /// Constructor with message and inner exception
  /// </summary>
  /// <param name="message"></param>
  /// <param name="innerException"></param>
  protected MerchantOrchestrationServiceDependencyValidationException(string? message, Exception? innerException)
    : base(message, innerException)
  {
  }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
