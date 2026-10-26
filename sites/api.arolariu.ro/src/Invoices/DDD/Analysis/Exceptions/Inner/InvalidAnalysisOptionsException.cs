namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when an analysis option contract violates capability invariants or dependency closure rules.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvalidAnalysisOptionsException : Exception
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvalidAnalysisOptionsException"/> class.
  /// </summary>
  public InvalidAnalysisOptionsException()
    : base("Analysis options are invalid.")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvalidAnalysisOptionsException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public InvalidAnalysisOptionsException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvalidAnalysisOptionsException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public InvalidAnalysisOptionsException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private InvalidAnalysisOptionsException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
