namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when an approved scan blob cannot satisfy the invoice upload contract.
/// </summary>
/// <remarks>
/// Messages intentionally omit blob paths, account names, and SAS query values. The marker maps the failure to a
/// caller-correctable HTTP 400 response after service-layer wrapping.
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed class InvoiceScanBlobValidationException : Exception, IValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceScanBlobValidationException"/> class.
  /// </summary>
  public InvoiceScanBlobValidationException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceScanBlobValidationException"/> class.
  /// </summary>
  /// <param name="message">The safe client-facing validation message.</param>
  public InvoiceScanBlobValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceScanBlobValidationException"/> class with a cause.
  /// </summary>
  /// <param name="message">The safe client-facing validation message.</param>
  /// <param name="innerException">The underlying storage exception.</param>
  public InvoiceScanBlobValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
