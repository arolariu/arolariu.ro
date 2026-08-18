namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when a caller attempts to renew, complete, or fail an analysis run using a lease
/// owner that does not match the run's current lease holder, or when the caller attempts to
/// claim a run whose lease is still held (not yet expired) by another worker.
/// </summary>
/// <remarks>
/// Implements <see cref="ILockedException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 423 Locked when this exception is
/// surfaced, whether unwrapped or wrapped by a Foundation outer exception. This is expected under normal worker contention and
/// MUST NOT be classified as a service failure.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisRunLeaseConflictException : Exception, ILockedException
{
  /// <summary>Initializes a new instance of the <see cref="AnalysisRunLeaseConflictException"/> class.</summary>
  public AnalysisRunLeaseConflictException() { }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunLeaseConflictException"/> class describing the conflicting lease ownership.</summary>
  /// <param name="runId">The identifier of the analysis run whose lease is in conflict.</param>
  /// <param name="expectedLeaseOwner">The lease owner supplied by the caller.</param>
  /// <param name="actualLeaseOwner">The lease owner currently recorded on the run, when any.</param>
  public AnalysisRunLeaseConflictException(Guid runId, string expectedLeaseOwner, string? actualLeaseOwner)
  : base($"Analysis run '{runId}' is leased by '{actualLeaseOwner ?? "<none>"}', not '{expectedLeaseOwner}'.")
  {
    RunId = runId;
    ExpectedLeaseOwner = expectedLeaseOwner;
    ActualLeaseOwner = actualLeaseOwner;
  }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunLeaseConflictException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public AnalysisRunLeaseConflictException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunLeaseConflictException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisRunLeaseConflictException(string message, Exception innerException)
  : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private AnalysisRunLeaseConflictException(SerializationInfo info, StreamingContext context)
  : base(info, context) { }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the identifier of the analysis run whose lease is in conflict, when supplied.</summary>
  public Guid? RunId { get; }

  /// <summary>Gets the lease owner supplied by the caller, when supplied.</summary>
  public string? ExpectedLeaseOwner { get; }

  /// <summary>Gets the lease owner currently recorded on the run, when supplied.</summary>
  public string? ActualLeaseOwner { get; }
}
