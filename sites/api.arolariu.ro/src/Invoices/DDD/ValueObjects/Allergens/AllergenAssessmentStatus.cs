namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Describes the overall outcome of an allergen assessment capability.
/// </summary>
[JsonConverter(typeof(StrictStringEnumConverter<AllergenAssessmentStatus>))]
public enum AllergenAssessmentStatus
{
  /// <summary>
  /// The capability succeeded and identified one or more allergen signals.
  /// </summary>
  [JsonStringEnumMemberName("detected")]
  Detected,

  /// <summary>
  /// The capability succeeded and found no allergen signals.
  /// </summary>
  [JsonStringEnumMemberName("noSignals")]
  NoSignals,

  /// <summary>
  /// The capability ran but did not have enough structured information to produce a reliable assessment.
  /// </summary>
  [JsonStringEnumMemberName("insufficientData")]
  InsufficientData,
}
