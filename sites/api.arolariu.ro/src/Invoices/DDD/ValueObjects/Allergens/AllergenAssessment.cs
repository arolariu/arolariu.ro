namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents the structured outcome of an allergen assessment capability.
/// </summary>
/// <remarks>
/// <para>A non-null <see cref="AllergenAssessment"/> value means the capability was selected and returned a structured section.</para>
/// <para><see cref="AllergenAssessmentStatus.NoSignals"/> is intentionally distinct from <see cref="AllergenAssessmentStatus.InsufficientData"/> so callers can differentiate between a successful empty result and insufficient evidence.</para>
/// </remarks>
[Serializable]
public sealed record AllergenAssessment
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AllergenAssessment"/> record.
  /// </summary>
  /// <param name="status">The overall outcome of the allergen assessment capability.</param>
  /// <param name="signals">The detected allergen signals.</param>
  /// <exception cref="ArgumentException">
  /// Thrown when <paramref name="status"/> and <paramref name="signals"/> contradict each other.
  /// </exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="signals"/> is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="status"/> is not a defined status.</exception>
  public AllergenAssessment(
    AllergenAssessmentStatus status,
    IReadOnlyList<AllergenSignal> signals)
  {
    if (!Enum.IsDefined(status))
    {
      throw new ArgumentOutOfRangeException(nameof(status), status, "Status must be a defined allergen assessment status.");
    }

    Status = status;
    Signals = AnalysisContractGuards.Snapshot(signals, nameof(signals));

    if (status == AllergenAssessmentStatus.Detected && Signals.Count == 0)
    {
      throw new ArgumentException("Detected allergen assessments must contain at least one signal.", nameof(signals));
    }

    if (status != AllergenAssessmentStatus.Detected && Signals.Count != 0)
    {
      throw new ArgumentException("Only detected allergen assessments may contain signals.", nameof(signals));
    }
  }

  /// <summary>
  /// Gets the overall outcome of the allergen assessment capability.
  /// </summary>
  public AllergenAssessmentStatus Status { get; }

  /// <summary>
  /// Gets the detected allergen signals.
  /// </summary>
  public IReadOnlyList<AllergenSignal> Signals { get; }

  /// <summary>Creates a detected allergen assessment containing one or more signals.</summary>
  /// <param name="signals">The detected allergen signals.</param>
  /// <returns>A detected allergen assessment.</returns>
  public static AllergenAssessment Detected(IReadOnlyList<AllergenSignal> signals) =>
    new(AllergenAssessmentStatus.Detected, signals);

  /// <summary>Creates a successful allergen assessment that found no signals.</summary>
  /// <returns>An allergen assessment whose status is <see cref="AllergenAssessmentStatus.NoSignals"/>.</returns>
  public static AllergenAssessment NoSignals() =>
    new(AllergenAssessmentStatus.NoSignals, []);

  /// <summary>Creates an allergen assessment that did not have enough data to produce a reliable result.</summary>
  /// <returns>An allergen assessment whose status is <see cref="AllergenAssessmentStatus.InsufficientData"/>.</returns>
  public static AllergenAssessment Insufficient() =>
    new(AllergenAssessmentStatus.InsufficientData, []);
}
