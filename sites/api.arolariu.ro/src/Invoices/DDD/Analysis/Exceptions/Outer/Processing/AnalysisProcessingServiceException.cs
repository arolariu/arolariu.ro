namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps unexpected analysis processing-layer service failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisProcessingServiceException : Exception, IServiceException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingServiceException"/> class.
  /// </summary>
  public AnalysisProcessingServiceException()
    : base("Analysis Processing Service Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingServiceException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying service exception.</param>
  public AnalysisProcessingServiceException(Exception innerException)
    : base("Analysis Processing Service Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingServiceException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisProcessingServiceException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisProcessingServiceException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisProcessingServiceException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisProcessingServiceException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
