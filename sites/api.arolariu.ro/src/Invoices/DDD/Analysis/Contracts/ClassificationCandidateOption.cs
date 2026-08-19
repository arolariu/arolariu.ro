namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents one bounded canonical taxonomy candidate offered back to the generative selector.
/// </summary>
/// <param name="Code">The canonical taxonomy code.</param>
/// <param name="OfficialLabel">The canonical official taxonomy label.</param>
public sealed record ClassificationCandidateOption(
  string Code,
  string OfficialLabel);
