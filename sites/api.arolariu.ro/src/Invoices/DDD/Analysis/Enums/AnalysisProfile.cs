namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Describes how an analysis option set was composed.
/// </summary>
/// <remarks>
/// <para><see cref="Custom"/> represents a caller-specified capability selection.</para>
/// <para><see cref="Fast"/> represents the minimal, low-latency preset published by the invoices analysis domain.</para>
/// <para><see cref="Balanced"/> represents the mid-tier preset that adds summarization and allergen assessment to <see cref="Fast"/>.</para>
/// <para><see cref="Comprehensive"/> represents the full end-to-end preset published by the invoices analysis domain.</para>
/// </remarks>
[JsonConverter(typeof(StrictStringEnumConverter<AnalysisProfile>))]
public enum AnalysisProfile
{
  /// <summary>
  /// Indicates that capability overrides produced an effective bespoke selection.
  /// </summary>
  [JsonStringEnumMemberName("custom")]
  Custom,

  /// <summary>
  /// Indicates that the caller selected the full end-to-end analysis preset.
  /// </summary>
  [JsonStringEnumMemberName("comprehensive")]
  Comprehensive,

  /// <summary>
  /// Indicates that the caller selected the minimal, low-latency analysis preset.
  /// </summary>
  [JsonStringEnumMemberName("fast")]
  Fast,

  /// <summary>
  /// Indicates that the caller selected the mid-tier analysis preset.
  /// </summary>
  [JsonStringEnumMemberName("balanced")]
  Balanced,
}
