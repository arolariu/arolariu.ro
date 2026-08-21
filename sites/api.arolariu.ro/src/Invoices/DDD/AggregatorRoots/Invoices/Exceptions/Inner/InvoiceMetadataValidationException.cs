namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when a client attempts to mutate invoice metadata outside the public contract.
/// </summary>
/// <remarks>
/// This typed validation error maps to HTTP 400 without exposing protected metadata keys, values, or processing
/// artifacts in the response.
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed class InvoiceMetadataValidationException : Exception, IValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceMetadataValidationException"/> class.
  /// </summary>
  public InvoiceMetadataValidationException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceMetadataValidationException"/> class.
  /// </summary>
  /// <param name="message">The safe client-facing validation message.</param>
  public InvoiceMetadataValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceMetadataValidationException"/> class with a cause.
  /// </summary>
  /// <param name="message">The safe client-facing validation message.</param>
  /// <param name="innerException">The exception that caused the validation failure.</param>
  public InvoiceMetadataValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
