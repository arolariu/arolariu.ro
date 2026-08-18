namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System.Text.Json.Serialization;
using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>Enumerates supported canonical taxonomy systems.</summary>
[JsonConverter(typeof(StrictStringEnumConverter<ClassificationSystem>))]
public enum ClassificationSystem
{
  /// <summary>GS1 Global Product Classification.</summary>
  [JsonStringEnumMemberName("GS1_GPC")]
  Gs1Gpc,

  /// <summary>European Classification of Individual Consumption, version 2.</summary>
  [JsonStringEnumMemberName("ECOICOP_V2")]
  EcoicopV2,

  /// <summary>European economic-activity classification, revision 2.1.</summary>
  [JsonStringEnumMemberName("NACE_2_1")]
  Nace21,
}
