namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps unexpected analysis foundation-layer service failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisFoundationServiceException : Exception, IServiceException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationServiceException"/> class.
  /// </summary>
  public AnalysisFoundationServiceException()
    : base("Analysis Foundation Service Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationServiceException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying service exception.</param>
  public AnalysisFoundationServiceException(Exception innerException)
    : base("Analysis Foundation Service Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationServiceException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisFoundationServiceException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationServiceException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisFoundationServiceException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisFoundationServiceException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
