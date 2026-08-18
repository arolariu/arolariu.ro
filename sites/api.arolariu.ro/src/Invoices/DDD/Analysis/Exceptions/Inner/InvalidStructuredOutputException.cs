namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when an analysis capability returns structured output that does not satisfy the published contracts.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvalidStructuredOutputException : Exception
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvalidStructuredOutputException"/> class.
  /// </summary>
  public InvalidStructuredOutputException()
    : base("Analysis structured output is invalid.")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvalidStructuredOutputException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public InvalidStructuredOutputException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="InvalidStructuredOutputException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public InvalidStructuredOutputException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private InvalidStructuredOutputException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
