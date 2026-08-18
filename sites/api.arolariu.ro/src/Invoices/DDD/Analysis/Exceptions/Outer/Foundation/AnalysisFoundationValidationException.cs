namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps analysis foundation-layer validation failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisFoundationValidationException : Exception, IValidationException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationValidationException"/> class.
  /// </summary>
  public AnalysisFoundationValidationException()
    : base("Analysis Foundation Validation Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationValidationException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying validation exception.</param>
  public AnalysisFoundationValidationException(Exception innerException)
    : base("Analysis Foundation Validation Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationValidationException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisFoundationValidationException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationValidationException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisFoundationValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisFoundationValidationException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
