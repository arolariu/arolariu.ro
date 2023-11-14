using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System;

namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;

/// <summary>
/// Invoice Orchestration Validation Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceOrchestrationValidationException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="InvoiceOrchestrationValidationException"/>
    /// </summary>
    /// <param name="innerException"></param>
    public InvoiceOrchestrationValidationException(Exception innerException)
        : base(
            message: "Invoice Orchestration Validation Exception",
            innerException)
    {
    }

    /// <summary>
    /// Serialization constructor
    /// </summary>
    /// <param name="info"></param>
    /// <param name="context"></param>
    protected InvoiceOrchestrationValidationException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
    }

    /// <summary>
    /// Base constructor
    /// </summary>
    public InvoiceOrchestrationValidationException()
        : base()
    {
    }

    /// <summary>
    /// Constructor with message
    /// </summary>
    /// <param name="message"></param>
    protected InvoiceOrchestrationValidationException(string? message) : base(message)
    {
    }

    /// <summary>
    /// Constructor with message and inner exception
    /// </summary>
    /// <param name="message"></param>
    /// <param name="innerException"></param>
    protected InvoiceOrchestrationValidationException(string? message, Exception? innerException)
        : base(message, innerException)
    {
    }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete

