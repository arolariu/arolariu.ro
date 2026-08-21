namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when an invoice does not contain the requested product line item.
/// </summary>
/// <remarks>
/// Implements <see cref="INotFoundException"/> so exception-to-HTTP mapping returns a 404 response even when
/// processing-layer exception wrapping adds operational context around this domain error.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class ProductNotFoundException : Exception, INotFoundException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductNotFoundException"/> class.
  /// </summary>
  public ProductNotFoundException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductNotFoundException"/> class for an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">The identifier of the invoice that does not contain the product.</param>
  public ProductNotFoundException(Guid invoiceIdentifier)
    : base($"The requested product line item was not found in invoice '{invoiceIdentifier}'.")
  {
    InvoiceIdentifier = invoiceIdentifier;
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductNotFoundException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public ProductNotFoundException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="ProductNotFoundException"/> class with a message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The exception that caused this exception.</param>
  public ProductNotFoundException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private ProductNotFoundException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051

  /// <summary>
  /// Gets the identifier of the invoice where the product lookup occurred.
  /// </summary>
  public Guid InvoiceIdentifier { get; }
}
