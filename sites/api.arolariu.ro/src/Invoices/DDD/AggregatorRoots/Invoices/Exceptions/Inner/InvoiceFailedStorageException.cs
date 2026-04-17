namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when the Cosmos DB storage layer is unavailable or returns an unexpected
/// server-side error (HTTP 500, 503, or connection failure). Maps to HTTP 503.
/// </summary>
/// <remarks>
/// Implements <see cref="IDependencyException"/>; <c>ExceptionToHttpResultMapper</c>
/// produces HTTP 503 Service Unavailable when this exception is surfaced, whether
/// unwrapped or wrapped by a higher-layer outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvoiceFailedStorageException : Exception, IDependencyException
{
  /// <summary>Initializes a new instance of the <see cref="InvoiceFailedStorageException"/> class.</summary>
  public InvoiceFailedStorageException() { }

  /// <summary>Initializes a new instance of the <see cref="InvoiceFailedStorageException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvoiceFailedStorageException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="InvoiceFailedStorageException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public InvoiceFailedStorageException(string message, Exception innerException)
      : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private InvoiceFailedStorageException(SerializationInfo info, StreamingContext context)
      : base(info, context) { }
#pragma warning restore SYSLIB0051
}
