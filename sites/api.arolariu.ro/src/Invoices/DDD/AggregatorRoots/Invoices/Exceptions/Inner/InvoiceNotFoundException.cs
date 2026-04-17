namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when an invoice lookup by identifier returns no result from the data store.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvoiceNotFoundException : Exception
{
	/// <summary>Initializes a new instance of the <see cref="InvoiceNotFoundException"/> class.</summary>
	public InvoiceNotFoundException() { }

	/// <summary>Initializes a new instance of the <see cref="InvoiceNotFoundException"/> class with the specified invoice identifier.</summary>
	/// <param name="invoiceIdentifier">The identifier of the invoice that was not found.</param>
	public InvoiceNotFoundException(Guid invoiceIdentifier)
		: base($"Invoice with identifier '{invoiceIdentifier}' was not found.")
	{
		InvoiceIdentifier = invoiceIdentifier;
	}

	/// <summary>Initializes a new instance of the <see cref="InvoiceNotFoundException"/> class with a custom message.</summary>
	/// <param name="message">The exception message.</param>
	public InvoiceNotFoundException(string message) : base(message) { }

	/// <summary>Initializes a new instance of the <see cref="InvoiceNotFoundException"/> class with a custom message and inner exception.</summary>
	/// <param name="message">The exception message.</param>
	/// <param name="innerException">The inner exception.</param>
	public InvoiceNotFoundException(string message, Exception innerException)
		: base(message, innerException) { }

#pragma warning disable SYSLIB0051
	private InvoiceNotFoundException(SerializationInfo info, StreamingContext context)
		: base(info, context) { }
#pragma warning restore SYSLIB0051

	/// <summary>Gets the identifier of the invoice that was not found.</summary>
	public Guid InvoiceIdentifier { get; }
}
