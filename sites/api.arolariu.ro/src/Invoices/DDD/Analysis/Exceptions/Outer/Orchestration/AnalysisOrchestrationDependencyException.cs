namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis orchestration-layer dependency failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisOrchestrationDependencyException : Exception, IDependencyException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyException"/> class.
  /// </summary>
  public AnalysisOrchestrationDependencyException()
    : base("Analysis Orchestration Dependency Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying dependency exception.</param>
  public AnalysisOrchestrationDependencyException(Exception innerException)
    : base("Analysis Orchestration Dependency Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisOrchestrationDependencyException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisOrchestrationDependencyException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisOrchestrationDependencyException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
