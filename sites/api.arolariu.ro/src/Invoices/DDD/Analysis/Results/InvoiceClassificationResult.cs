namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents the immutable transient result of ECOICOP v2 invoice-level classification for one analysis run.
/// </summary>
public sealed record InvoiceClassificationResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceClassificationResult"/> record.
  /// </summary>
  /// <param name="classification">The canonical ECOICOP v2 classification produced for the invoice.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="classification"/> is null.</exception>
  public InvoiceClassificationResult(StandardClassification classification)
  {
    Classification = classification ?? throw new ArgumentNullException(nameof(classification));
  }

  /// <summary>Gets the canonical ECOICOP v2 classification produced for the invoice.</summary>
  public StandardClassification Classification { get; }
}
