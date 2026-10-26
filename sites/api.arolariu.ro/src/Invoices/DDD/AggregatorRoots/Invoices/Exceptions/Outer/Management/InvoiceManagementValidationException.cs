namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management;

using System;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Represents a caller-correctable validation failure classified by the invoice Management layer.
/// </summary>
[Serializable]
public sealed class InvoiceManagementValidationException : Exception, IValidationException
{
  /// <summary>Initializes a new instance of the <see cref="InvoiceManagementValidationException"/> class.</summary>
  public InvoiceManagementValidationException()
    : base("Invoice Management Validation Exception")
  {
  }

  /// <summary>Initializes a new instance with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvoiceManagementValidationException(string message)
    : base(message)
  {
  }

  /// <summary>Initializes a new instance with a custom message and cause.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The failure that caused this exception.</param>
  public InvoiceManagementValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceManagementValidationException"/> class.
  /// </summary>
  /// <param name="innerException">The Processing-layer failure being classified.</param>
  public InvoiceManagementValidationException(Exception innerException)
    : base("Invoice Management Validation Exception", innerException)
  {
  }
}
