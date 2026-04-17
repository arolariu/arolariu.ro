namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when the dependency rejects the request due to missing/invalid authentication (HTTP 401 at Cosmos or downstream boundary).
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvoiceUnauthorizedAccessException : Exception
{
	/// <summary>Initializes a new instance of the <see cref="InvoiceUnauthorizedAccessException"/> class.</summary>
	public InvoiceUnauthorizedAccessException() { }

	/// <summary>Initializes a new instance of the <see cref="InvoiceUnauthorizedAccessException"/> class with a custom message.</summary>
	/// <param name="message">The exception message.</param>
	public InvoiceUnauthorizedAccessException(string message) : base(message) { }

	/// <summary>Initializes a new instance of the <see cref="InvoiceUnauthorizedAccessException"/> class with a custom message and inner exception.</summary>
	/// <param name="message">The exception message.</param>
	/// <param name="innerException">The inner exception.</param>
	public InvoiceUnauthorizedAccessException(string message, Exception innerException)
		: base(message, innerException) { }

#pragma warning disable SYSLIB0051
	private InvoiceUnauthorizedAccessException(SerializationInfo info, StreamingContext context)
		: base(info, context) { }
#pragma warning restore SYSLIB0051
}
