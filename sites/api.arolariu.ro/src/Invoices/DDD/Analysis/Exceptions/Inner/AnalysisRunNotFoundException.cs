namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when an analysis run lookup by identifier returns no result from the data store.
/// </summary>
/// <remarks>
/// Implements <see cref="INotFoundException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 404 Not Found when this exception is
/// surfaced, whether unwrapped or wrapped by a Foundation outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisRunNotFoundException : Exception, INotFoundException
{
  /// <summary>Initializes a new instance of the <see cref="AnalysisRunNotFoundException"/> class.</summary>
  public AnalysisRunNotFoundException() { }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunNotFoundException"/> class with the specified run identifier.</summary>
  /// <param name="runId">The identifier of the analysis run that was not found.</param>
  public AnalysisRunNotFoundException(Guid runId)
  : base($"Analysis run with identifier '{runId}' was not found.")
  {
    RunId = runId;
  }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunNotFoundException"/> class with the specified run identifier and inner exception.</summary>
  /// <param name="runId">The identifier of the analysis run that was not found.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisRunNotFoundException(Guid runId, Exception innerException)
  : base($"Analysis run with identifier '{runId}' was not found.", innerException)
  {
    RunId = runId;
  }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunNotFoundException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public AnalysisRunNotFoundException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunNotFoundException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisRunNotFoundException(string message, Exception innerException)
  : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private AnalysisRunNotFoundException(SerializationInfo info, StreamingContext context)
  : base(info, context) { }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the identifier of the analysis run that was not found, when supplied.</summary>
  public Guid? RunId { get; }
}
