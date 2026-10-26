namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis foundation-layer dependency validation failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisFoundationDependencyValidationException : Exception, IDependencyValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyValidationException"/> class.
  /// </summary>
  public AnalysisFoundationDependencyValidationException()
    : base("Analysis Foundation Dependency Validation Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyValidationException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying dependency validation exception.</param>
  public AnalysisFoundationDependencyValidationException(Exception innerException)
    : base("Analysis Foundation Dependency Validation Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyValidationException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisFoundationDependencyValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyValidationException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisFoundationDependencyValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisFoundationDependencyValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
