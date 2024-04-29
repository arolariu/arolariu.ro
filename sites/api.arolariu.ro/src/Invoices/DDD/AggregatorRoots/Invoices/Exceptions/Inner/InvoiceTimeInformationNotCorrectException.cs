namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Invoice time information not correct Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceTimeInformationNotCorrectException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="InvoiceTimeInformationNotCorrectException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public InvoiceTimeInformationNotCorrectException(Exception innerException)
		: base(
			message: "Invoice time information not correct Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected InvoiceTimeInformationNotCorrectException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Base constructor
	/// </summary>
	public InvoiceTimeInformationNotCorrectException()
		: base()
	{
	}

	/// <summary>
	/// Constructor with message
	/// </summary>
	/// <param name="message"></param>
	protected InvoiceTimeInformationNotCorrectException(string? message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	protected InvoiceTimeInformationNotCorrectException(string? message, Exception? innerException)
		: base(message, innerException)
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
