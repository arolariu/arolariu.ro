namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the processing-layer execution outcome of one claimed analysis run.
/// </summary>
/// <remarks>
/// This contract carries the claimed durable run, the immutable target patch produced by analysis, the capabilities
/// that produced a usable result, and optional bounded failure metadata when the run must be failed instead of
/// completed.
/// </remarks>
/// <param name="ClaimedRun">The durable run that was claimed for execution.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result.</param>
/// <param name="FailureCode">The stable failure code for a failed execution, or <see langword="null"/>.</param>
/// <param name="FailureReason">The bounded failure reason for a failed execution, or <see langword="null"/>.</param>
public abstract record AnalysisExecutionResult(
  AnalysisRun ClaimedRun,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities,
  string? FailureCode,
  AnalysisFailureReason? FailureReason)
{
  /// <summary>
  /// Gets a value indicating whether this execution result represents a terminal failure.
  /// </summary>
  public bool Failed => FailureCode is not null && FailureReason.HasValue;
}

/// <summary>
/// Represents the immutable execution outcome for an invoice analysis run.
/// </summary>
/// <param name="ClaimedRun">The durable run that was claimed for execution.</param>
/// <param name="TargetPatch">The immutable invoice patch produced by the analysis pipeline.</param>
/// <param name="MerchantCandidate">The transient merchant candidate observed during analysis, if any.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result.</param>
/// <param name="FailureCode">The stable failure code for a failed execution, or <see langword="null"/>.</param>
/// <param name="FailureReason">The bounded failure reason for a failed execution, or <see langword="null"/>.</param>
public sealed record InvoiceAnalysisExecutionResult(
  AnalysisRun ClaimedRun,
  InvoiceAnalysisPatch TargetPatch,
  MerchantCandidate? MerchantCandidate,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities,
  string? FailureCode = null,
  AnalysisFailureReason? FailureReason = null)
  : AnalysisExecutionResult(ClaimedRun, CompletedCapabilities, FailureCode, FailureReason);

/// <summary>
/// Represents the immutable execution outcome for a merchant analysis run.
/// </summary>
/// <param name="ClaimedRun">The durable run that was claimed for execution.</param>
/// <param name="TargetPatch">The immutable merchant patch produced by the analysis pipeline.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result.</param>
/// <param name="FailureCode">The stable failure code for a failed execution, or <see langword="null"/>.</param>
/// <param name="FailureReason">The bounded failure reason for a failed execution, or <see langword="null"/>.</param>
public sealed record MerchantAnalysisExecutionResult(
  AnalysisRun ClaimedRun,
  MerchantAnalysisPatch TargetPatch,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities,
  string? FailureCode = null,
  AnalysisFailureReason? FailureReason = null)
  : AnalysisExecutionResult(ClaimedRun, CompletedCapabilities, FailureCode, FailureReason);

/// <summary>
/// Represents a terminal failed execution that produced no target patch.
/// </summary>
/// <param name="ClaimedRun">The durable run that was claimed for execution.</param>
/// <param name="FailureCode">The stable failure code for the failed execution.</param>
/// <param name="BoundedFailureReason">The bounded failure reason for the failed execution.</param>
public sealed record FailedAnalysisExecutionResult(
  AnalysisRun ClaimedRun,
  string FailureCode,
  AnalysisFailureReason BoundedFailureReason)
  : AnalysisExecutionResult(ClaimedRun, [], FailureCode, BoundedFailureReason);
