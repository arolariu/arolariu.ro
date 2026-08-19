namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System.Text.Json.Serialization;
using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Enumerates the decision paths that can produce a canonical classification.
/// </summary>
/// <remarks>
/// Values use explicit, case-sensitive JSON wire names. The origin controls the
/// confidence invariant enforced by <see cref="StandardClassification"/>.
/// </remarks>
[JsonConverter(typeof(StrictStringEnumConverter<ClassificationOrigin>))]
public enum ClassificationOrigin
{
  /// <summary>
  /// Indicates an automated analysis decision that must include confidence.
  /// </summary>
  [JsonStringEnumMemberName("Analysis")]
  Analysis,

  /// <summary>
  /// Indicates a human selection or correction, for which confidence is omitted.
  /// </summary>
  [JsonStringEnumMemberName("Manual")]
  Manual,
}
