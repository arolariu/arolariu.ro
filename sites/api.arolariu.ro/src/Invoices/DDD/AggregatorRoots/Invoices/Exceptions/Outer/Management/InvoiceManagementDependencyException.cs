namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management;

using System;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Represents an external dependency failure classified by the invoice Management layer.
/// </summary>
[Serializable]
public sealed class InvoiceManagementDependencyException : Exception, IDependencyException
{
  /// <summary>Initializes a new instance of the <see cref="InvoiceManagementDependencyException"/> class.</summary>
  public InvoiceManagementDependencyException()
    : base("Invoice Management Dependency Exception")
  {
  }

  /// <summary>Initializes a new instance with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvoiceManagementDependencyException(string message)
    : base(message)
  {
  }

  /// <summary>Initializes a new instance with a custom message and cause.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The failure that caused this exception.</param>
  public InvoiceManagementDependencyException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceManagementDependencyException"/> class.
  /// </summary>
  /// <param name="innerException">The Processing-layer failure being classified.</param>
  public InvoiceManagementDependencyException(Exception innerException)
    : base("Invoice Management Dependency Exception", innerException)
  {
  }
}
