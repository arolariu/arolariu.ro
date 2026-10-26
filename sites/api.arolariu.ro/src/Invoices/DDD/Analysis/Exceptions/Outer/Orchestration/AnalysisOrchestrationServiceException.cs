namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Wraps unexpected analysis orchestration-layer service failures for HTTP mapping.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisOrchestrationServiceException : Exception, IServiceException
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationServiceException"/> class.
  /// </summary>
  public AnalysisOrchestrationServiceException()
    : base("Analysis Orchestration Service Exception")
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationServiceException"/> class with an inner exception.
  /// </summary>
  /// <param name="innerException">The underlying service exception.</param>
  public AnalysisOrchestrationServiceException(Exception innerException)
    : base("Analysis Orchestration Service Exception", innerException)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationServiceException"/> class with a custom message.
  /// </summary>
  /// <param name="message">The exception message.</param>
  public AnalysisOrchestrationServiceException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisOrchestrationServiceException"/> class with a custom message and inner exception.
  /// </summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisOrchestrationServiceException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private AnalysisOrchestrationServiceException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051
}
