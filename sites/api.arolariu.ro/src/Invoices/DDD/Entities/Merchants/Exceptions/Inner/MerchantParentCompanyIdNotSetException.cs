﻿namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Merchant Parent Company Identifier not set Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class MerchantParentCompanyIdNotSetException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="MerchantParentCompanyIdNotSetException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public MerchantParentCompanyIdNotSetException(Exception innerException)
		: base(
			message: "Merchant parent company identifier not set Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected MerchantParentCompanyIdNotSetException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Base constructor
	/// </summary>
	public MerchantParentCompanyIdNotSetException()
		: base()
	{
	}

	/// <summary>
	/// Constructor with message
	/// </summary>
	/// <param name="message"></param>
	protected MerchantParentCompanyIdNotSetException(string? message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	protected MerchantParentCompanyIdNotSetException(string? message, Exception? innerException)
		: base(message, innerException)
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete