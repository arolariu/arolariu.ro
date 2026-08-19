namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when the backend cannot inspect an approved scan blob through its storage credential.
/// </summary>
/// <remarks>
/// This failure represents backend storage availability or authorization, not client SAS permissions. It maps to a
/// safe HTTP 503 response and intentionally omits all storage topology and credential detail.
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed class InvoiceScanBlobDependencyException : Exception, IDependencyException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceScanBlobDependencyException"/> class.
  /// </summary>
  public InvoiceScanBlobDependencyException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceScanBlobDependencyException"/> class.
  /// </summary>
  /// <param name="message">The safe dependency-failure message.</param>
  public InvoiceScanBlobDependencyException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceScanBlobDependencyException"/> class.
  /// </summary>
  /// <param name="message">The safe dependency-failure message.</param>
  /// <param name="innerException">The underlying storage exception.</param>
  public InvoiceScanBlobDependencyException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
