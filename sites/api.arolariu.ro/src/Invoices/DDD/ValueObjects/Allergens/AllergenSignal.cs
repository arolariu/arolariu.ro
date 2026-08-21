namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents a detected allergen signal with confidence and supporting evidence.
/// </summary>
public sealed record AllergenSignal
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AllergenSignal"/> record.
  /// </summary>
  /// <param name="code">The canonical EU-14 allergen code.</param>
  /// <param name="evidenceLevel">The strength of evidence supporting the signal.</param>
  /// <param name="confidence">The confidence score in the inclusive range <c>[0, 1]</c>.</param>
  /// <param name="evidence">The supporting evidence fragments for the signal.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="evidence"/> is empty.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="evidence"/> is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="code"/>, <paramref name="evidenceLevel"/>, or <paramref name="confidence"/> is invalid.
  /// </exception>
  public AllergenSignal(
    AllergenCode code,
    AllergenEvidenceLevel evidenceLevel,
    double confidence,
    IReadOnlyList<AllergenEvidence> evidence)
  {
    if (!Enum.IsDefined(code))
    {
      throw new ArgumentOutOfRangeException(nameof(code), code, "Allergen code must be a defined EU-14 member.");
    }

    if (!Enum.IsDefined(evidenceLevel))
    {
      throw new ArgumentOutOfRangeException(nameof(evidenceLevel), evidenceLevel, "Evidence level must be a defined allergen evidence level.");
    }

    Code = code;
    EvidenceLevel = evidenceLevel;
    Confidence = AnalysisContractGuards.RequireConfidence(confidence, nameof(confidence));
    Evidence = AnalysisContractGuards.Snapshot(evidence, nameof(evidence));

    if (Evidence.Count == 0)
    {
      throw new ArgumentException("Allergen signals must contain at least one evidence item.", nameof(evidence));
    }
  }

  /// <summary>
  /// Gets the canonical EU-14 allergen code.
  /// </summary>
  public AllergenCode Code { get; }

  /// <summary>
  /// Gets the strength of evidence supporting the signal.
  /// </summary>
  public AllergenEvidenceLevel EvidenceLevel { get; }

  /// <summary>
  /// Gets the confidence score in the inclusive range <c>[0, 1]</c>.
  /// </summary>
  public double Confidence { get; }

  /// <summary>
  /// Gets the supporting evidence fragments for the signal.
  /// </summary>
  public IReadOnlyList<AllergenEvidence> Evidence { get; }
}
