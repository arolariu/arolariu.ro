using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System;

namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

/// <summary>
/// Invoice payment information not correct Exception
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
#pragma warning disable SYSLIB0051 // Type or member is obsolete
public class InvoicePaymentInformationNotCorrectException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="InvoicePaymentInformationNotCorrectException"/>
    /// </summary>
    /// <param name="innerException"></param>
    public InvoicePaymentInformationNotCorrectException(Exception innerException)
        : base(
            message: "Invoice payment information not correct Exception",
            innerException)
    {
    }

    /// <summary>
    /// Serialization constructor
    /// </summary>
    /// <param name="info"></param>
    /// <param name="context"></param>
    protected InvoicePaymentInformationNotCorrectException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
    }

    /// <summary>
    /// Base constructor
    /// </summary>
    public InvoicePaymentInformationNotCorrectException()
        : base()
    {
    }

    /// <summary>
    /// Constructor with message
    /// </summary>
    /// <param name="message"></param>
    protected InvoicePaymentInformationNotCorrectException(string? message) : base(message)
    {
    }

    /// <summary>
    /// Constructor with message and inner exception
    /// </summary>
    /// <param name="message"></param>
    /// <param name="innerException"></param>
    protected InvoicePaymentInformationNotCorrectException(string? message, Exception? innerException)
        : base(message, innerException)
    {
    }
}
#pragma warning restore SYSLIB0051 // Type or member is obsolete
