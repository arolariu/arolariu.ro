namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Enumerates the supported canonical taxonomy systems for invoice product classification.
/// </summary>
/// <remarks>
/// <para>Each member maps to a generated taxonomy artifact embedded in the invoices bounded-context assembly.</para>
/// <para><b>Usage:</b> Use these values when resolving AI-produced codes, validating manual picker selections, or mapping persisted standard classifications.</para>
/// </remarks>
[JsonConverter(typeof(StrictStringEnumConverter<ClassificationSystem>))]
public enum ClassificationSystem
{
  /// <summary>GS1 Global Product Classification.</summary>
  [JsonStringEnumMemberName("GS1_GPC")]
  Gs1Gpc,

  /// <summary>European Classification of Individual Consumption by Purpose, version 2.</summary>
  [JsonStringEnumMemberName("ECOICOP_V2")]
  EcoicopV2,

  /// <summary>Statistical Classification of Economic Activities in the European Community, revision 2.1.</summary>
  [JsonStringEnumMemberName("NACE_2_1")]
  Nace21,
}
