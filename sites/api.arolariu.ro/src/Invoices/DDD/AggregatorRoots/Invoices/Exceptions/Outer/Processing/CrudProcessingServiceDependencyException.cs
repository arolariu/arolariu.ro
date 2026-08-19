namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;

using System;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Invoice processing service dependency exception.
/// </summary>
[Serializable]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class CrudProcessingServiceDependencyException : Exception, IDependencyException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="CrudProcessingServiceDependencyException"/>
  /// </summary>
  /// <param name="innerException"></param>
  public CrudProcessingServiceDependencyException(Exception innerException)
    : base(
      message: "CRUD Processing Dependency Exception",
      innerException)
  {
  }

  /// <summary>
  /// Serialization constructor
  /// </summary>
  /// <param name="info"></param>
  /// <param name="context"></param>
  protected CrudProcessingServiceDependencyException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }

  /// <summary>
  /// Constructor with message.
  /// </summary>
  /// <param name="message"></param>
  public CrudProcessingServiceDependencyException(string message) : base(message)
  {
  }

  /// <summary>
  /// Constructor with message and inner exception.
  /// </summary>
  /// <param name="message"></param>
  /// <param name="innerException"></param>
  public CrudProcessingServiceDependencyException(string message, Exception innerException) : base(message, innerException)
  {
  }

  /// <summary>
  /// Base constructor.
  /// </summary>
  public CrudProcessingServiceDependencyException() : base()
  {
  }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
