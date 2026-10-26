namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management;

using System;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Represents a caller-visible dependency validation failure classified by the invoice Management layer.
/// </summary>
[Serializable]
public sealed class InvoiceManagementDependencyValidationException : Exception, IDependencyValidationException
{
  /// <summary>Initializes a new instance of the <see cref="InvoiceManagementDependencyValidationException"/> class.</summary>
  public InvoiceManagementDependencyValidationException()
    : base("Invoice Management Dependency Validation Exception")
  {
  }

  /// <summary>Initializes a new instance with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvoiceManagementDependencyValidationException(string message)
    : base(message)
  {
  }

  /// <summary>Initializes a new instance with a custom message and cause.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The failure that caused this exception.</param>
  public InvoiceManagementDependencyValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceManagementDependencyValidationException"/> class.
  /// </summary>
  /// <param name="innerException">The Processing-layer or access-control failure being classified.</param>
  public InvoiceManagementDependencyValidationException(Exception innerException)
    : base("Invoice Management Dependency Validation Exception", innerException)
  {
  }
}
