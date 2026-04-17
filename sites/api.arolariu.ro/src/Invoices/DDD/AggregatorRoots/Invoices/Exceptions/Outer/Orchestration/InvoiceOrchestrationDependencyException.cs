namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;

using System;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Invoice Orchestration Dependency Exception
/// </summary>
[Serializable]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceOrchestrationDependencyException : Exception, IDependencyException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceOrchestrationDependencyException"/>
  /// </summary>
  /// <param name="innerException"></param>
  public InvoiceOrchestrationDependencyException(Exception innerException)
    : base(
      message: "Invoice Orchestration Dependency Exception",
      innerException)
  {
  }

  /// <summary>
  /// Serialization constructor
  /// </summary>
  /// <param name="info"></param>
  /// <param name="context"></param>
  protected InvoiceOrchestrationDependencyException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }

  /// <summary>
  /// Base constructor
  /// </summary>
  public InvoiceOrchestrationDependencyException()
    : base()
  {
  }

  /// <summary>
  /// Constructor with message
  /// </summary>
  /// <param name="message"></param>
  protected InvoiceOrchestrationDependencyException(string? message) : base(message)
  {
  }

  /// <summary>
  /// Constructor with message and inner exception
  /// </summary>
  /// <param name="message"></param>
  /// <param name="innerException"></param>
  protected InvoiceOrchestrationDependencyException(string? message, Exception? innerException)
    : base(message, innerException)
  {
  }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
