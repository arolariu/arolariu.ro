using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

/// <summary>
/// Invoice Identifier not set Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoiceIdNotSetException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="InvoiceIdNotSetException"/>
    /// </summary>
    /// <param name="innerException"></param>
    public InvoiceIdNotSetException(Exception innerException)
        : base(
            message: "Invoice identifier not set Exception",
            innerException)
    {
    }

    /// <summary>
    /// Serialization constructor
    /// </summary>
    /// <param name="info"></param>
    /// <param name="context"></param>
    protected InvoiceIdNotSetException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
    }

    /// <summary>
    /// Base constructor
    /// </summary>
    public InvoiceIdNotSetException()
        : base()
    {
    }

    /// <summary>
    /// Constructor with message
    /// </summary>
    /// <param name="message"></param>
    protected InvoiceIdNotSetException(string? message) : base(message)
    {
    }

    /// <summary>
    /// Constructor with message and inner exception
    /// </summary>
    /// <param name="message"></param>
    /// <param name="innerException"></param>
    protected InvoiceIdNotSetException(string? message, Exception? innerException)
        : base(message, innerException)
    {
    }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
