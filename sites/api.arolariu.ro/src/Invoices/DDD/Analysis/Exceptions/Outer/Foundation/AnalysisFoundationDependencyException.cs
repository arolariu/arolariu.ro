namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis foundation-layer dependency failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisFoundationDependencyException : Exception, IDependencyException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyException"/> class.
  /// </summary>
  public AnalysisFoundationDependencyException()
    : base("Analysis Foundation Dependency Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying dependency exception.</param>
  public AnalysisFoundationDependencyException(Exception innerException)
    : base("Analysis Foundation Dependency Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisFoundationDependencyException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationDependencyException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisFoundationDependencyException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisFoundationDependencyException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
