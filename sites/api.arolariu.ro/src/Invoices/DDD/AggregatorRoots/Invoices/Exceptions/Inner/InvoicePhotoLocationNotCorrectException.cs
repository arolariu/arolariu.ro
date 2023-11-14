using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System;

namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

/// <summary>
/// Invoice Photo Location not correct Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoicePhotoLocationNotCorrectException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="InvoicePhotoLocationNotCorrectException"/>
    /// </summary>
    /// <param name="innerException"></param>
    public InvoicePhotoLocationNotCorrectException(Exception innerException)
        : base(
            message: "Invoice photo location not correct Exception",
            innerException)
    {
    }

    /// <summary>
    /// Serialization constructor
    /// </summary>
    /// <param name="info"></param>
    /// <param name="context"></param>
    protected InvoicePhotoLocationNotCorrectException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
    }

    /// <summary>
    /// Base constructor
    /// </summary>
    public InvoicePhotoLocationNotCorrectException()
        : base()
    {
    }

    /// <summary>
    /// Constructor with message
    /// </summary>
    /// <param name="message"></param>
    protected InvoicePhotoLocationNotCorrectException(string? message) : base(message)
    {
    }

    /// <summary>
    /// Constructor with message and inner exception
    /// </summary>
    /// <param name="message"></param>
    /// <param name="innerException"></param>
    protected InvoicePhotoLocationNotCorrectException(string? message, Exception? innerException)
        : base(message, innerException)
    {
    }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
