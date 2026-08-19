namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents the immutable transient result of NACE 2.1 merchant-level classification for one analysis run.
/// </summary>
public sealed record MerchantClassificationResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantClassificationResult"/> record.
  /// </summary>
  /// <param name="classification">The canonical NACE 2.1 classification produced for the merchant.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="classification"/> is null.</exception>
  public MerchantClassificationResult(StandardClassification classification)
  {
    Classification = classification ?? throw new ArgumentNullException(nameof(classification));
  }

  /// <summary>Gets the canonical NACE 2.1 classification produced for the merchant.</summary>
  public StandardClassification Classification { get; }
}
