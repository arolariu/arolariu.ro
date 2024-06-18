namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Invoice processing service dependency exception.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceProcessingServiceDependencyException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="InvoiceProcessingServiceDependencyException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public InvoiceProcessingServiceDependencyException(Exception innerException)
		: base(
			message: "Invoice Processing Dependency Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected InvoiceProcessingServiceDependencyException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Constructor with message.
	/// </summary>
	/// <param name="message"></param>
	public InvoiceProcessingServiceDependencyException(string message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception.
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	public InvoiceProcessingServiceDependencyException(string message, Exception innerException) : base(message, innerException)
	{
	}

	/// <summary>
	/// Base constructor.
	/// </summary>
	public InvoiceProcessingServiceDependencyException() : base()
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
