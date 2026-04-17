namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

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
public sealed class MerchantFailedStorageException : Exception, IDependencyException
{
  /// <summary>Initializes a new instance of the <see cref="MerchantFailedStorageException"/> class.</summary>
  public MerchantFailedStorageException() { }

  /// <summary>Initializes a new instance of the <see cref="MerchantFailedStorageException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public MerchantFailedStorageException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="MerchantFailedStorageException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public MerchantFailedStorageException(string message, Exception innerException)
      : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private MerchantFailedStorageException(SerializationInfo info, StreamingContext context)
      : base(info, context) { }
#pragma warning restore SYSLIB0051
}
