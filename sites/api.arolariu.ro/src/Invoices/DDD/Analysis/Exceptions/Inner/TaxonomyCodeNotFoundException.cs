namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Thrown when a requested taxonomy code does not exist in the selected classification system.
/// </summary>
/// <remarks>
/// <para>Implements <see cref="INotFoundException"/> so endpoint-level exception mapping can surface HTTP 404 semantics when this failure escapes higher layers.</para>
/// <para><b>Usage:</b> Raised by the taxonomy broker during canonical code resolution when callers request a non-existent code.</para>
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class TaxonomyCodeNotFoundException : Exception, INotFoundException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="TaxonomyCodeNotFoundException"/> class.
  /// </summary>
  public TaxonomyCodeNotFoundException()
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="TaxonomyCodeNotFoundException"/> class with the requested system and code.
  /// </summary>
  /// <param name="system">The classification system that was searched.</param>
  /// <param name="code">The taxonomy code that could not be found.</param>
  public TaxonomyCodeNotFoundException(ClassificationSystem system, string code)
    : base($"Taxonomy code '{code}' was not found in classification system '{system}'.")
  {
    System = system;
    Code = code;
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="TaxonomyCodeNotFoundException"/> class with the requested system, code, and inner exception.
  /// </summary>
  /// <param name="system">The classification system that was searched.</param>
  /// <param name="code">The taxonomy code that could not be found.</param>
  /// <param name="innerException">The inner exception.</param>
  public TaxonomyCodeNotFoundException(ClassificationSystem system, string code, Exception innerException)
    : base($"Taxonomy code '{code}' was not found in classification system '{system}'.", innerException)
  {
    System = system;
    Code = code;
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="TaxonomyCodeNotFoundException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public TaxonomyCodeNotFoundException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="TaxonomyCodeNotFoundException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public TaxonomyCodeNotFoundException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private TaxonomyCodeNotFoundException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the classification system that was searched.</summary>
  public ClassificationSystem? System { get; }

  /// <summary>Gets the taxonomy code that could not be found.</summary>
  public string? Code { get; }
}
