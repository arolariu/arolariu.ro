namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Invoice Validation Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceFoundationValidationException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="InvoiceFoundationValidationException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public InvoiceFoundationValidationException(Exception innerException)
		: base(
			message: "Invoice Validation Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected InvoiceFoundationValidationException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Base constructor
	/// </summary>
	public InvoiceFoundationValidationException()
		: base()
	{
	}

	/// <summary>
	/// Constructor with message
	/// </summary>
	/// <param name="message"></param>
	protected InvoiceFoundationValidationException(string? message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	protected InvoiceFoundationValidationException(string? message, Exception? innerException)
		: base(message, innerException)
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
