namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Thrown when a caller attempts to move an <c>AnalysisRun</c> aggregate through a state transition
/// that is not permitted from its current <see cref="AnalysisRunStatus"/>.
/// </summary>
/// <remarks>
/// This is a domain validation failure (400 Bad Request once wrapped by a Foundation outer exception), not a dependency or
/// service failure — the caller supplied an operation that does not apply to the run's current lifecycle state.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class InvalidAnalysisRunTransitionException : Exception
{
  /// <summary>Initializes a new instance of the <see cref="InvalidAnalysisRunTransitionException"/> class.</summary>
  public InvalidAnalysisRunTransitionException()
    : base("The requested analysis run transition is invalid.")
  {
  }

  /// <summary>Initializes a new instance of the <see cref="InvalidAnalysisRunTransitionException"/> class describing the rejected transition.</summary>
  /// <param name="fromStatus">The run's current status.</param>
  /// <param name="toStatus">The status the caller attempted to transition to.</param>
  public InvalidAnalysisRunTransitionException(AnalysisRunStatus fromStatus, AnalysisRunStatus toStatus)
    : base($"Cannot transition an analysis run from '{fromStatus}' to '{toStatus}'.")
  {
    FromStatus = fromStatus;
    ToStatus = toStatus;
  }

  /// <summary>Initializes a new instance of the <see cref="InvalidAnalysisRunTransitionException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public InvalidAnalysisRunTransitionException(string message)
    : base(message)
  {
  }

  /// <summary>Initializes a new instance of the <see cref="InvalidAnalysisRunTransitionException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public InvalidAnalysisRunTransitionException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

#pragma warning disable SYSLIB0051
  private InvalidAnalysisRunTransitionException(SerializationInfo info, StreamingContext context)
    : base(info, context)
  {
  }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the run's status at the time of the rejected transition, when supplied.</summary>
  public AnalysisRunStatus? FromStatus { get; }

  /// <summary>Gets the status the caller attempted to transition to, when supplied.</summary>
  public AnalysisRunStatus? ToStatus { get; }
}
