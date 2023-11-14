using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System;

namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;

/// <summary>
/// Invoice Service Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceFoundationServiceException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="InvoiceFoundationServiceException"/>
    /// </summary>
    /// <param name="innerException"></param>
    public InvoiceFoundationServiceException(Exception innerException)
        : base(
            message: "Invoice Service Exception",
            innerException)
    {
    }

    /// <summary>
    /// Serialization constructor
    /// </summary>
    /// <param name="info"></param>
    /// <param name="context"></param>
    protected InvoiceFoundationServiceException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
    }

    /// <summary>
    /// Base constructor
    /// </summary>
    public InvoiceFoundationServiceException()
        : base()
    {
    }

    /// <summary>
    /// Constructor with message
    /// </summary>
    /// <param name="message"></param>
    protected InvoiceFoundationServiceException(string? message) : base(message)
    {
    }

    /// <summary>
    /// Constructor with message and inner exception
    /// </summary>
    /// <param name="message"></param>
    /// <param name="innerException"></param>
    protected InvoiceFoundationServiceException(string? message, Exception? innerException)
        : base(message, innerException)
    {
    }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete