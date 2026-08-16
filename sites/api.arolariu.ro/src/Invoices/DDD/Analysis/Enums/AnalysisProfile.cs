namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Describes how an analysis option set was composed.
/// </summary>
/// <remarks>
/// <para><see cref="Custom"/> represents a caller-specified capability selection.</para>
/// <para><see cref="Fast"/> represents the minimal, low-latency preset published by the invoices analysis domain.</para>
/// <para><see cref="Balanced"/> represents the mid-tier preset that adds summarization and allergen assessment to <see cref="Fast"/>.</para>
/// <para><see cref="Comprehensive"/> represents the full end-to-end preset published by the invoices analysis domain.</para>
/// </remarks>
public enum AnalysisProfile
{
  /// <summary>
  /// Indicates that the caller composed a bespoke set of analysis capabilities.
  /// </summary>
  Custom,

  /// <summary>
  /// Indicates that the caller selected the full end-to-end analysis preset.
  /// </summary>
  Comprehensive,

  /// <summary>
  /// Indicates that the caller selected the minimal, low-latency analysis preset.
  /// </summary>
  Fast,

  /// <summary>
  /// Indicates that the caller selected the mid-tier analysis preset.
  /// </summary>
  Balanced,
}
