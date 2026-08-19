namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System.Text.Json.Serialization;
using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Enumerates the canonical taxonomy systems supported by invoice classification.
/// </summary>
/// <remarks>
/// Each value selects an independently versioned artifact and uses an explicit,
/// case-sensitive JSON wire name. Numeric and undeclared string representations are
/// rejected by <see cref="StrictStringEnumConverter{TEnum}"/>.
/// </remarks>
[JsonConverter(typeof(StrictStringEnumConverter<ClassificationSystem>))]
public enum ClassificationSystem
{
  /// <summary>
  /// Identifies GS1 Global Product Classification for trade-item categorization.
  /// </summary>
  [JsonStringEnumMemberName("GS1_GPC")]
  Gs1Gpc,

  /// <summary>
  /// Identifies ECOICOP version 2 for consumption-purpose categorization.
  /// </summary>
  [JsonStringEnumMemberName("ECOICOP_V2")]
  EcoicopV2,

  /// <summary>
  /// Identifies the European economic-activity classification, revision 2.1.
  /// </summary>
  [JsonStringEnumMemberName("NACE_2_1")]
  Nace21,
}
