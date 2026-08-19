namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the orchestration-layer execution outcome of one queued analysis message.
/// </summary>
/// <remarks>
/// This contract carries the queue message, the immutable target patch produced by analysis, the capabilities
/// that produced a usable result, and an optional bounded failure reason.
/// </remarks>
/// <param name="Message">The queued analysis message being executed.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result.</param>
/// <param name="FailureReason">The bounded failure reason for a failed execution, or <see langword="null"/>.</param>
public abstract record AnalysisExecutionResult(
  AnalysisQueueMessage Message,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities,
  AnalysisFailureReason? FailureReason)
{
  /// <summary>
  /// Gets a value indicating whether this execution result represents a terminal failure.
  /// </summary>
  public bool Failed => FailureReason.HasValue;
}

/// <summary>
/// Represents the immutable execution outcome for an invoice analysis message.
/// </summary>
/// <param name="Message">The queued analysis message being executed.</param>
/// <param name="TargetPatch">The immutable invoice patch produced by the analysis pipeline.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result.</param>
/// <param name="FailureReason">The bounded failure reason for a failed execution, or <see langword="null"/>.</param>
public sealed record InvoiceAnalysisExecutionResult(
  AnalysisQueueMessage Message,
  InvoiceAnalysisPatch TargetPatch,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities,
  AnalysisFailureReason? FailureReason = null)
  : AnalysisExecutionResult(Message, CompletedCapabilities, FailureReason);

/// <summary>
/// Represents the immutable execution outcome for a merchant analysis message.
/// </summary>
/// <param name="Message">The queued analysis message being executed.</param>
/// <param name="TargetPatch">The immutable merchant patch produced by the analysis pipeline.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result.</param>
/// <param name="FailureReason">The bounded failure reason for a failed execution, or <see langword="null"/>.</param>
public sealed record MerchantAnalysisExecutionResult(
  AnalysisQueueMessage Message,
  MerchantAnalysisPatch TargetPatch,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities,
  AnalysisFailureReason? FailureReason = null)
  : AnalysisExecutionResult(Message, CompletedCapabilities, FailureReason);
