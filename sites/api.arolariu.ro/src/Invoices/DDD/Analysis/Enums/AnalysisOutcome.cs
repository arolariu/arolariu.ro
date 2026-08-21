namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Enumerates the bounded terminal outcomes reported by analysis telemetry.
/// </summary>
/// <remarks>
/// <para>This enum exists so telemetry dimensions stay low-cardinality by construction: callers cannot supply an
/// arbitrary outcome string, and the metric tag value is derived from the enum inside
/// <c>InvoiceMetrics</c>.</para>
/// </remarks>
[JsonConverter(typeof(StrictStringEnumConverter<AnalysisOutcome>))]
public enum AnalysisOutcome
{
  /// <summary>Every requested unit of work produced a usable result.</summary>
  [JsonStringEnumMemberName("success")]
  Success,

  /// <summary>Some requested units of work produced a usable result while others were skipped or failed.</summary>
  [JsonStringEnumMemberName("partial")]
  Partial,

  /// <summary>The unit of work produced no usable result.</summary>
  [JsonStringEnumMemberName("failure")]
  Failure,
}
