namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis orchestration-layer dependency validation failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisOrchestrationDependencyValidationException : Exception, IDependencyValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyValidationException"/> class.
  /// </summary>
  public AnalysisOrchestrationDependencyValidationException()
    : base("Analysis Orchestration Dependency Validation Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyValidationException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying dependency validation exception.</param>
  public AnalysisOrchestrationDependencyValidationException(Exception innerException)
    : base("Analysis Orchestration Dependency Validation Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyValidationException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisOrchestrationDependencyValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationDependencyValidationException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisOrchestrationDependencyValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisOrchestrationDependencyValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
