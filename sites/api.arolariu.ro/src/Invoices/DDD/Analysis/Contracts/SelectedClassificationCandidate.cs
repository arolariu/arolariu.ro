namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents one AI-selected taxonomy candidate code and its advisory confidence.
/// </summary>
/// <remarks>
/// This transient contract is exchanged only between the generative and classification analysis layers.
/// The selected code must still be validated against the canonical taxonomy before it can reach persistence.
/// </remarks>
/// <param name="Code">The candidate taxonomy code selected from the offered bounded candidate set.</param>
/// <param name="Confidence">The model-reported confidence in the inclusive range <c>[0, 1]</c>.</param>
public sealed record SelectedClassificationCandidate(
  string Code,
  double Confidence);
