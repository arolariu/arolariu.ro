namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis orchestration-layer validation failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisOrchestrationValidationException : Exception, IValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationValidationException"/> class.
  /// </summary>
  public AnalysisOrchestrationValidationException()
    : base("Analysis Orchestration Validation Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationValidationException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying validation exception.</param>
  public AnalysisOrchestrationValidationException(Exception innerException)
    : base("Analysis Orchestration Validation Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationValidationException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisOrchestrationValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationValidationException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisOrchestrationValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisOrchestrationValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
