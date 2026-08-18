namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis processing-layer validation failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisProcessingValidationException : Exception, IValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingValidationException"/> class.
  /// </summary>
  public AnalysisProcessingValidationException()
    : base("Analysis Processing Validation Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingValidationException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying validation exception.</param>
  public AnalysisProcessingValidationException(Exception innerException)
    : base("Analysis Processing Validation Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingValidationException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisProcessingValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingValidationException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisProcessingValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisProcessingValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
