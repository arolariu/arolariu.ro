namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management;

using System;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Represents an unclassified service failure at the invoice Management boundary.
/// </summary>
[Serializable]
public sealed class InvoiceManagementServiceException : Exception, IServiceException
{
  /// <summary>Initializes a new instance of the <see cref="InvoiceManagementServiceException"/> class.</summary>
  public InvoiceManagementServiceException()
    : base("Invoice Management Service Exception")
  {
  }

  /// <summary>Initializes a new instance with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvoiceManagementServiceException(string message)
    : base(message)
  {
  }

  /// <summary>Initializes a new instance with a custom message and cause.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The failure that caused this exception.</param>
  public InvoiceManagementServiceException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceManagementServiceException"/> class.
  /// </summary>
  /// <param name="innerException">The failure being classified.</param>
  public InvoiceManagementServiceException(Exception innerException)
    : base("Invoice Management Service Exception", innerException)
  {
  }
}
