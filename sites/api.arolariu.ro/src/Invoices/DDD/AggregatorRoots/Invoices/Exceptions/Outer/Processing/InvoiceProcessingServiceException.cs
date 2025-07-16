namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Invoice processing service exception.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceProcessingServiceException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="InvoiceProcessingServiceException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public InvoiceProcessingServiceException(Exception innerException)
		: base(
			message: "Invoice Processing Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected InvoiceProcessingServiceException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Constructor with message.
	/// </summary>
	/// <param name="message"></param>
	public InvoiceProcessingServiceException(string message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception.
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	public InvoiceProcessingServiceException(string message, Exception innerException) : base(message, innerException)
	{
	}

	/// <summary>
	/// Base constructor.
	/// </summary>
	public InvoiceProcessingServiceException() : base()
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
