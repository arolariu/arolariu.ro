namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

/// <summary>
/// Represents the set of merchant entity mutations derived from a completed analysis run.
/// </summary>
/// <remarks>
/// <para><b>Section semantics:</b> Each member is nullable and independent. A <see langword="null"/> section means the
/// corresponding capability did not produce a usable result during the run and the previously persisted value MUST be
/// left untouched. A non-null section is authoritative and replaces the previously persisted value.</para>
/// </remarks>
/// <param name="ClassificationUpdate">The NACE classification for the merchant.</param>
/// <param name="DescriptionUpdate">The evidence-bound generated merchant description.</param>
public sealed record MerchantAnalysisPatch(
  MerchantClassificationResult? ClassificationUpdate,
  MerchantDescriptionResult? DescriptionUpdate)
{
  /// <summary>
  /// Gets a value indicating whether this patch carries at least one mutation.
  /// </summary>
  public bool HasChanges => ClassificationUpdate is not null || DescriptionUpdate is not null;
}
