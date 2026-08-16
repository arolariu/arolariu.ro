namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Enumerates the lifecycle states of a durable analysis run.
/// </summary>
/// <remarks>
/// <para><b>Transitions:</b> <see cref="Queued"/> → <see cref="Running"/> (via claim); <see cref="Running"/> → <see cref="Running"/>
/// (via lease renewal or reclaim of an expired lease); <see cref="Running"/> → <see cref="Completed"/> or <see cref="Failed"/> (terminal).
/// <see cref="Completed"/> and <see cref="Failed"/> are terminal states; no further transitions are permitted from them.</para>
/// </remarks>
public enum AnalysisRunStatus
{
  /// <summary>The run has been accepted and is waiting to be claimed by a worker.</summary>
  Queued,

  /// <summary>The run is currently claimed and being processed by a worker holding an active lease.</summary>
  Running,

  /// <summary>The run finished successfully.</summary>
  Completed,

  /// <summary>The run finished with a failure.</summary>
  Failed,
}
