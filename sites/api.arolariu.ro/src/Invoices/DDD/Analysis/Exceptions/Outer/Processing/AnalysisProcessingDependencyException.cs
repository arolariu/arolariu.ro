namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis processing-layer dependency failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisProcessingDependencyException : Exception, IDependencyException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyException"/> class.
  /// </summary>
  public AnalysisProcessingDependencyException()
    : base("Analysis Processing Dependency Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying dependency exception.</param>
  public AnalysisProcessingDependencyException(Exception innerException)
    : base("Analysis Processing Dependency Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisProcessingDependencyException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisProcessingDependencyException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisProcessingDependencyException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
