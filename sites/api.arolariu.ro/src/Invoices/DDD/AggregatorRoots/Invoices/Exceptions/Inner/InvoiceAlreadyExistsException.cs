namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when attempting to create an invoice with an identifier that already exists in the data store (Cosmos HTTP 409).
/// </summary>
/// <remarks>
/// Implements <see cref="IAlreadyExistsException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 409 Conflict when this exception is surfaced, whether unwrapped or wrapped by a higher-layer outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvoiceAlreadyExistsException : Exception, IAlreadyExistsException
{
/// <summary>Initializes a new instance of the <see cref="InvoiceAlreadyExistsException"/> class.</summary>
public InvoiceAlreadyExistsException() { }

/// <summary>Initializes a new instance of the <see cref="InvoiceAlreadyExistsException"/> class with the specified invoice identifier.</summary>
/// <param name="invoiceIdentifier">The identifier of the invoice that already exists.</param>
public InvoiceAlreadyExistsException(Guid invoiceIdentifier)
: base($"Invoice with identifier '{invoiceIdentifier}' already exists.")
{
InvoiceIdentifier = invoiceIdentifier;
}

/// <summary>Initializes a new instance of the <see cref="InvoiceAlreadyExistsException"/> class with the specified invoice identifier and inner exception.</summary>
/// <param name="invoiceIdentifier">The identifier of the invoice that already exists.</param>
/// <param name="innerException">The inner exception.</param>
public InvoiceAlreadyExistsException(Guid invoiceIdentifier, Exception innerException)
: base($"Invoice with identifier '{invoiceIdentifier}' already exists.", innerException)
{
InvoiceIdentifier = invoiceIdentifier;
}

/// <summary>Initializes a new instance of the <see cref="InvoiceAlreadyExistsException"/> class with a custom message.</summary>
/// <param name="message">The exception message.</param>
public InvoiceAlreadyExistsException(string message) : base(message) { }

/// <summary>Initializes a new instance of the <see cref="InvoiceAlreadyExistsException"/> class with a custom message and inner exception.</summary>
/// <param name="message">The exception message.</param>
/// <param name="innerException">The inner exception.</param>
public InvoiceAlreadyExistsException(string message, Exception innerException)
: base(message, innerException) { }

#pragma warning disable SYSLIB0051
private InvoiceAlreadyExistsException(SerializationInfo info, StreamingContext context)
: base(info, context) { }
#pragma warning restore SYSLIB0051

/// <summary>Gets the identifier of the invoice that already exists.</summary>
public Guid InvoiceIdentifier { get; }
}
