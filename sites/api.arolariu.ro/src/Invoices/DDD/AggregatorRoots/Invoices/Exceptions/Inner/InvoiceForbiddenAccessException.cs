namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when the caller has authenticated but lacks permission for the requested
/// invoice (e.g., cross-user access). Maps to HTTP 403 Forbidden.
/// </summary>
/// <remarks>
/// Implements <see cref="IForbiddenException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 403 Forbidden when this exception is surfaced, whether unwrapped or wrapped by a higher-layer outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvoiceForbiddenAccessException : Exception, IForbiddenException
{
  /// <summary>Initializes a new instance of the <see cref="InvoiceForbiddenAccessException"/> class.</summary>
  public InvoiceForbiddenAccessException() { }

  /// <summary>Initializes a new instance of the <see cref="InvoiceForbiddenAccessException"/> class with invoice and user identifiers.</summary>
  /// <param name="invoiceIdentifier">The identifier of the invoice that the user is forbidden from accessing.</param>
  /// <param name="requestingUserIdentifier">The identifier of the user attempting to access the invoice.</param>
  public InvoiceForbiddenAccessException(Guid invoiceIdentifier, Guid requestingUserIdentifier)
  : base($"User '{requestingUserIdentifier}' is forbidden from accessing invoice '{invoiceIdentifier}'.")
  {
    InvoiceIdentifier = invoiceIdentifier;
    RequestingUserIdentifier = requestingUserIdentifier;
  }

  /// <summary>Initializes a new instance of the <see cref="InvoiceForbiddenAccessException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvoiceForbiddenAccessException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="InvoiceForbiddenAccessException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public InvoiceForbiddenAccessException(string message, Exception innerException)
  : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private InvoiceForbiddenAccessException(SerializationInfo info, StreamingContext context)
  : base(info, context) { }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the identifier of the invoice that the user is forbidden from accessing.</summary>
  public Guid InvoiceIdentifier { get; }

  /// <summary>Gets the identifier of the user attempting to access the invoice.</summary>
  public Guid RequestingUserIdentifier { get; }
}
