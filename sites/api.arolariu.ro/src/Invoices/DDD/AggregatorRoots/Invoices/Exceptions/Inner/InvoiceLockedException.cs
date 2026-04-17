namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when an invoice is soft-deleted and cannot be mutated or read through the standard read path. Maps to HTTP 423 Locked.
/// </summary>
/// <remarks>
/// Implements <see cref="ILockedException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 423 Locked when this exception is surfaced, whether unwrapped or wrapped by a higher-layer outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvoiceLockedException : Exception, ILockedException
{
  /// <summary>Initializes a new instance of the <see cref="InvoiceLockedException"/> class.</summary>
  public InvoiceLockedException() { }

  /// <summary>Initializes a new instance of the <see cref="InvoiceLockedException"/> class with the specified invoice identifier.</summary>
  /// <param name="invoiceIdentifier">The identifier of the locked invoice.</param>
  public InvoiceLockedException(Guid invoiceIdentifier)
  : base($"Invoice with identifier '{invoiceIdentifier}' is locked (soft-deleted).")
  {
    InvoiceIdentifier = invoiceIdentifier;
  }

  /// <summary>Initializes a new instance of the <see cref="InvoiceLockedException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvoiceLockedException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="InvoiceLockedException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public InvoiceLockedException(string message, Exception innerException)
  : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private InvoiceLockedException(SerializationInfo info, StreamingContext context)
  : base(info, context) { }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the identifier of the locked invoice.</summary>
  public Guid InvoiceIdentifier { get; }
}
