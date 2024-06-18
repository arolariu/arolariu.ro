namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Merchant Orchestration Service Dependency Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class MerchantOrchestrationServiceDependencyException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="MerchantOrchestrationServiceDependencyException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public MerchantOrchestrationServiceDependencyException(Exception innerException)
		: base(
			message: "Merchant Orchestration Service Dependency Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected MerchantOrchestrationServiceDependencyException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Base constructor
	/// </summary>
	public MerchantOrchestrationServiceDependencyException()
		: base()
	{
	}

	/// <summary>
	/// Constructor with message
	/// </summary>
	/// <param name="message"></param>
	protected MerchantOrchestrationServiceDependencyException(string? message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	protected MerchantOrchestrationServiceDependencyException(string? message, Exception? innerException)
		: base(message, innerException)
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
