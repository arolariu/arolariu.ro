namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Identifies the domain target being enriched by an analysis capability.
/// </summary>
public enum AnalysisTargetType
{
  /// <summary>
  /// The capability targets an invoice aggregate or invoice-wide projection.
  /// </summary>
  Invoice,

  /// <summary>
  /// The capability targets a merchant entity or merchant-derived projection.
  /// </summary>
  Merchant,

  /// <summary>
  /// The capability targets an individual invoice product line.
  /// </summary>
  Product,
}
