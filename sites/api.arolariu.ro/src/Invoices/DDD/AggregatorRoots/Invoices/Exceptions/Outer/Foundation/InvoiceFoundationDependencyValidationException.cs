namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Invoice Dependency Validation Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceFoundationDependencyValidationException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="InvoiceFoundationDependencyValidationException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public InvoiceFoundationDependencyValidationException(Exception innerException)
		: base(
			message: "Invoice Dependency Validation Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected InvoiceFoundationDependencyValidationException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Base constructor
	/// </summary>
	public InvoiceFoundationDependencyValidationException()
		: base()
	{
	}

	/// <summary>
	/// Constructor with message
	/// </summary>
	/// <param name="message"></param>
	protected InvoiceFoundationDependencyValidationException(string? message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	protected InvoiceFoundationDependencyValidationException(string? message, Exception? innerException)
		: base(message, innerException)
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
