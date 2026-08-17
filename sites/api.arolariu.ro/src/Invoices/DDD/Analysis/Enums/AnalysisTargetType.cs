namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Identifies the domain target being enriched by an analysis capability.
/// </summary>
[JsonConverter(typeof(StrictStringEnumConverter<AnalysisTargetType>))]
public enum AnalysisTargetType
{
  /// <summary>
  /// The capability targets an invoice aggregate or invoice-wide projection.
  /// </summary>
  [JsonStringEnumMemberName("invoice")]
  Invoice,

  /// <summary>
  /// The capability targets a merchant entity or merchant-derived projection.
  /// </summary>
  [JsonStringEnumMemberName("merchant")]
  Merchant,

  /// <summary>
  /// The capability targets an individual invoice product line.
  /// </summary>
  [JsonStringEnumMemberName("product")]
  Product,
}
