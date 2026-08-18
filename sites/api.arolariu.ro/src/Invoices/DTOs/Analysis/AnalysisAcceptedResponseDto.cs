namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the acknowledgement returned when an analysis run has been durably accepted into the queue.
/// </summary>
/// <remarks>
/// <para>This projection is returned with HTTP 202 Accepted. It describes what was accepted, not what was produced: the
/// run has not executed yet at the time the response is written.</para>
/// <para><b>Effective options:</b> <see cref="Profile"/> and <see cref="AcceptedCapabilities"/> reflect the effective
/// options resolved once, at queue time, and persisted on the durable run. A worker executes those persisted options
/// verbatim, so this acknowledgement is an accurate contract for what will run.</para>
/// </remarks>
/// <param name="RunId">The identifier of the durable analysis run.</param>
/// <param name="TargetType">The kind of aggregate the run analyzes.</param>
/// <param name="TargetId">The identifier of the aggregate the run analyzes.</param>
/// <param name="Status">The durable status of the run at acceptance time.</param>
/// <param name="Profile">The effective profile persisted on the run.</param>
/// <param name="AcceptedCapabilities">The capabilities the persisted effective options will execute.</param>
/// <param name="AcceptedAt">The instant the run was accepted.</param>
[Serializable]
public readonly record struct AnalysisAcceptedResponseDto(
  Guid RunId,
  AnalysisTargetType TargetType,
  Guid TargetId,
  AnalysisRunStatus Status,
  AnalysisProfile Profile,
  IReadOnlyCollection<AnalysisCapability> AcceptedCapabilities,
  DateTimeOffset AcceptedAt)
{
  /// <summary>
  /// Projects a durable analysis run into its transport acknowledgement.
  /// </summary>
  /// <param name="run">The persisted analysis run to project.</param>
  /// <returns>The acknowledgement describing the accepted run.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="run"/> is null.</exception>
  public static AnalysisAcceptedResponseDto FromRun(AnalysisRun run)
  {
    ArgumentNullException.ThrowIfNull(run);

    return new AnalysisAcceptedResponseDto(
      run.Id,
      run.TargetType,
      run.TargetId,
      run.Status,
      ResolveProfile(run),
      ResolveAcceptedCapabilities(run),
      run.AcceptedAt);
  }

  private static AnalysisProfile ResolveProfile(AnalysisRun run) =>
    run.InvoiceOptions?.Profile ?? run.MerchantOptions?.Profile ?? AnalysisProfile.Custom;

  // The accepted capability set is the run's own requested capability set: deriving it here as well would let the
  // API response and the pipeline's terminal outcome telemetry disagree about what the run was accepted to do.
  private static ReadOnlyCollection<AnalysisCapability> ResolveAcceptedCapabilities(AnalysisRun run) =>
    new([.. run.RequestedCapabilities]);
}
