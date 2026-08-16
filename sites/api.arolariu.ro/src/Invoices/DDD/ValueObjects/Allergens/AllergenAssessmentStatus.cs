namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Describes the overall outcome of an allergen assessment capability.
/// </summary>
public enum AllergenAssessmentStatus
{
  /// <summary>
  /// The capability succeeded and identified one or more allergen signals.
  /// </summary>
  Detected,

  /// <summary>
  /// The capability succeeded and found no allergen signals.
  /// </summary>
  NoSignals,

  /// <summary>
  /// The capability ran but did not have enough structured information to produce a reliable assessment.
  /// </summary>
  InsufficientData,
}
