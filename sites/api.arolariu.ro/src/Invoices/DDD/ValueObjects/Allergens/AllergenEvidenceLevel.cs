namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Describes the strength of evidence supporting an allergen signal.
/// </summary>
public enum AllergenEvidenceLevel
{
  /// <summary>
  /// The allergen is explicitly stated by the structured output or directly extracted source text.
  /// </summary>
  Explicit,

  /// <summary>
  /// The allergen is inferred from related product or recipe context.
  /// </summary>
  Inferred,

  /// <summary>
  /// The allergen is precautionary or trace-oriented rather than directly confirmed.
  /// </summary>
  Precautionary,
}
