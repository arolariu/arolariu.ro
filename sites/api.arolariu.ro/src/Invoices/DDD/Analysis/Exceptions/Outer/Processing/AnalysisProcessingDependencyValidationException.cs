namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis processing-layer dependency validation failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisProcessingDependencyValidationException : Exception, IDependencyValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyValidationException"/> class.
  /// </summary>
  public AnalysisProcessingDependencyValidationException()
    : base("Analysis Processing Dependency Validation Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyValidationException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying dependency validation exception.</param>
  public AnalysisProcessingDependencyValidationException(Exception innerException)
    : base("Analysis Processing Dependency Validation Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyValidationException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisProcessingDependencyValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingDependencyValidationException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisProcessingDependencyValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisProcessingDependencyValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
