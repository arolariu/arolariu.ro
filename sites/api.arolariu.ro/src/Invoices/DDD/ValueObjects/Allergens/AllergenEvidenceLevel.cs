namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Describes the strength of evidence supporting an allergen signal.
/// </summary>
[JsonConverter(typeof(StrictStringEnumConverter<AllergenEvidenceLevel>))]
public enum AllergenEvidenceLevel
{
  /// <summary>
  /// The allergen is explicitly stated by the structured output or directly extracted source text.
  /// </summary>
  [JsonStringEnumMemberName("explicit")]
  Explicit,

  /// <summary>
  /// The allergen is inferred from related product or recipe context.
  /// </summary>
  [JsonStringEnumMemberName("inferred")]
  Inferred,

  /// <summary>
  /// The allergen is precautionary or trace-oriented rather than directly confirmed.
  /// </summary>
  [JsonStringEnumMemberName("precautionary")]
  Precautionary,
}
