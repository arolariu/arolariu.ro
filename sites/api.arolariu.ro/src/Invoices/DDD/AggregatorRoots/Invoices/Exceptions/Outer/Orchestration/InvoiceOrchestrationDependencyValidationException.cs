﻿namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Invoice Orchestration Dependency Validation Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceOrchestrationDependencyValidationException : Exception
{
	/// <summary>
	/// Initializes a new instance of the <see cref="InvoiceOrchestrationDependencyValidationException"/>
	/// </summary>
	/// <param name="innerException"></param>
	public InvoiceOrchestrationDependencyValidationException(Exception innerException)
		: base(
			message: "Invoice Orchestration Dependency Validation Exception",
			innerException)
	{
	}

	/// <summary>
	/// Serialization constructor
	/// </summary>
	/// <param name="info"></param>
	/// <param name="context"></param>
	protected InvoiceOrchestrationDependencyValidationException(SerializationInfo info, StreamingContext context)
		: base(info, context)
	{
	}

	/// <summary>
	/// Base constructor
	/// </summary>
	public InvoiceOrchestrationDependencyValidationException()
		: base()
	{
	}

	/// <summary>
	/// Constructor with message
	/// </summary>
	/// <param name="message"></param>
	protected InvoiceOrchestrationDependencyValidationException(string? message) : base(message)
	{
	}

	/// <summary>
	/// Constructor with message and inner exception
	/// </summary>
	/// <param name="message"></param>
	/// <param name="innerException"></param>
	protected InvoiceOrchestrationDependencyValidationException(string? message, Exception? innerException)
		: base(message, innerException)
	{
	}
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
