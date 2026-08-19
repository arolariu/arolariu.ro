namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Represents the immutable transient result of typed receipt extraction across one or more scans.
/// </summary>
public sealed record ReceiptExtractionResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ReceiptExtractionResult"/> record.
  /// </summary>
  /// <param name="products">The normalized deduplicated products.</param>
  /// <param name="paymentInformation">The merged payment information.</param>
  /// <param name="receiptType">The merged receipt type.</param>
  /// <param name="countryRegion">The merged country or region.</param>
  /// <param name="taxDetails">The merged deduplicated tax lines.</param>
  /// <param name="payments">The merged deduplicated payment lines.</param>
  public ReceiptExtractionResult(
    IReadOnlyList<ExtractedProduct> products,
    PaymentInformation paymentInformation,
    string receiptType,
    string countryRegion,
    IReadOnlyList<TaxDetail> taxDetails,
    IReadOnlyList<PaymentDetail> payments)
  {
    ArgumentNullException.ThrowIfNull(paymentInformation);

    Products = Snapshot(products, nameof(products));
    PaymentInformation = ClonePaymentInformation(paymentInformation);
    ReceiptType = AnalysisContractGuards.NormalizeOptionalText(receiptType) ?? string.Empty;
    CountryRegion = AnalysisContractGuards.NormalizeOptionalText(countryRegion) ?? string.Empty;
    TaxDetails = SnapshotAndClone(taxDetails, nameof(taxDetails), static taxDetail => new TaxDetail
    {
      Amount = taxDetail.Amount,
      Rate = taxDetail.Rate,
      NetAmount = taxDetail.NetAmount,
      Description = taxDetail.Description,
    });
    Payments = SnapshotAndClone(payments, nameof(payments), static paymentDetail => new PaymentDetail
    {
      Method = paymentDetail.Method,
      Amount = paymentDetail.Amount,
    });
  }

  /// <summary>
  /// Gets the normalized deduplicated products.
  /// </summary>
  public IReadOnlyList<ExtractedProduct> Products { get; }

  /// <summary>
  /// Gets the merged payment information.
  /// </summary>
  public PaymentInformation PaymentInformation { get; }

  /// <summary>
  /// Gets the merged receipt type.
  /// </summary>
  public string ReceiptType { get; }

  /// <summary>
  /// Gets the merged country or region.
  /// </summary>
  public string CountryRegion { get; }

  /// <summary>
  /// Gets the merged deduplicated tax lines.
  /// </summary>
  public IReadOnlyList<TaxDetail> TaxDetails { get; }

  /// <summary>
  /// Gets the merged deduplicated payment lines.
  /// </summary>
  public IReadOnlyList<PaymentDetail> Payments { get; }

  private static PaymentInformation ClonePaymentInformation(PaymentInformation paymentInformation) =>
    new()
    {
      TransactionDate = paymentInformation.TransactionDate,
      PaymentType = paymentInformation.PaymentType,
      Currency = paymentInformation.Currency,
      TotalCostAmount = paymentInformation.TotalCostAmount,
      TotalTaxAmount = paymentInformation.TotalTaxAmount,
      SubtotalAmount = paymentInformation.SubtotalAmount,
      TipAmount = paymentInformation.TipAmount,
    };

  private static ReadOnlyCollection<TItem> Snapshot<TItem>(IReadOnlyList<TItem> items, string parameterName)
  {
    ArgumentNullException.ThrowIfNull(items);

    var snapshot = new TItem[items.Count];

    for (int index = 0; index < items.Count; index++)
    {
      TItem item = items[index];

      if (item is null)
      {
        throw new ArgumentException("Collection items must not be null.", parameterName);
      }

      snapshot[index] = item;
    }

    return new ReadOnlyCollection<TItem>(snapshot);
  }

  private static ReadOnlyCollection<TItem> SnapshotAndClone<TItem>(
    IReadOnlyList<TItem> items,
    string parameterName,
    Func<TItem, TItem> clone)
  {
    ArgumentNullException.ThrowIfNull(clone);

    var snapshot = Snapshot(items, parameterName);
    var clones = new TItem[snapshot.Count];

    for (int index = 0; index < snapshot.Count; index++)
    {
      clones[index] = clone(snapshot[index]);
    }

    return new ReadOnlyCollection<TItem>(clones);
  }
}
