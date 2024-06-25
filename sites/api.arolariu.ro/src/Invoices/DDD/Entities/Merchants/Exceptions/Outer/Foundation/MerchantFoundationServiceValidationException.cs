namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Merchant Foundation Service Validation Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class MerchantFoundationServiceValidationException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="MerchantFoundationServiceValidationException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public MerchantFoundationServiceValidationException(Exception innerException)
		: base(
			message: "Merchant Foundation Service Validation Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected MerchantFoundationServiceValidationException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Base constructor
	/// </summary>
	public MerchantFoundationServiceValidationException()
		: base()
	{
	}

	/// <summary>
	/// Constructor with message
	/// </summary>
	/// <param name="message"></param>
	protected MerchantFoundationServiceValidationException(string? message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	protected MerchantFoundationServiceValidationException(string? message, Exception? innerException)
		: base(message, innerException)
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
