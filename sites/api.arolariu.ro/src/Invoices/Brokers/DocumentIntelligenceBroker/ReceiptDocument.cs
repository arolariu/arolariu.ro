namespace arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents the provider-neutral structured output returned by receipt-document OCR analysis.
/// </summary>
/// <remarks>
/// <para>
/// This contract deliberately avoids invoice, merchant, and product aggregate types so broker output
/// remains portable across providers and future pipeline stages.
/// </para>
/// <para>
/// Confidence and source-scan provenance are preserved transiently on every extracted field via
/// <see cref="DocumentValue{TValue}"/>.
/// </para>
/// </remarks>
public sealed record ReceiptDocument
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ReceiptDocument"/> record.
  /// </summary>
  /// <param name="merchant">The merchant section extracted from the scan.</param>
  /// <param name="products">The extracted product lines.</param>
  /// <param name="payment">The extracted payment-information section.</param>
  /// <param name="receiptType">The extracted receipt-type field.</param>
  /// <param name="countryRegion">The extracted country or region field.</param>
  /// <param name="taxDetails">The extracted tax lines.</param>
  /// <param name="payments">The extracted payment lines.</param>
  public ReceiptDocument(
    ReceiptMerchantDocument merchant,
    IReadOnlyList<ReceiptProductDocument> products,
    ReceiptPaymentDocument payment,
    DocumentValue<string> receiptType,
    DocumentValue<string> countryRegion,
    IReadOnlyList<ReceiptTaxDocument> taxDetails,
    IReadOnlyList<ReceiptPaymentLineDocument> payments)
  {
    ArgumentNullException.ThrowIfNull(merchant);
    ArgumentNullException.ThrowIfNull(payment);
    ArgumentNullException.ThrowIfNull(receiptType);
    ArgumentNullException.ThrowIfNull(countryRegion);

    Merchant = merchant;
    Products = Snapshot(products, nameof(products));
    Payment = payment;
    ReceiptType = receiptType;
    CountryRegion = countryRegion;
    TaxDetails = Snapshot(taxDetails, nameof(taxDetails));
    Payments = Snapshot(payments, nameof(payments));
  }

  /// <summary>
  /// Gets the merchant section extracted from the scan.
  /// </summary>
  public ReceiptMerchantDocument Merchant { get; }

  /// <summary>
  /// Gets the extracted product lines.
  /// </summary>
  public IReadOnlyList<ReceiptProductDocument> Products { get; }

  /// <summary>
  /// Gets the extracted payment-information section.
  /// </summary>
  public ReceiptPaymentDocument Payment { get; }

  /// <summary>
  /// Gets the extracted receipt-type field.
  /// </summary>
  public DocumentValue<string> ReceiptType { get; }

  /// <summary>
  /// Gets the extracted country or region field.
  /// </summary>
  public DocumentValue<string> CountryRegion { get; }

  /// <summary>
  /// Gets the extracted tax lines.
  /// </summary>
  public IReadOnlyList<ReceiptTaxDocument> TaxDetails { get; }

  /// <summary>
  /// Gets the extracted payment lines.
  /// </summary>
  public IReadOnlyList<ReceiptPaymentLineDocument> Payments { get; }

  /// <summary>
  /// Returns a copy of the document whose field provenance points to the supplied source scan index.
  /// </summary>
  /// <param name="sourceScanIndex">The zero-based input scan index.</param>
  /// <returns>A stamped copy of the current receipt document.</returns>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="sourceScanIndex"/> is less than zero.
  /// </exception>
  public ReceiptDocument WithSourceScanIndex(int sourceScanIndex)
  {
    ValidateSourceScanIndex(sourceScanIndex);

    var stampedProducts = new ReceiptProductDocument[Products.Count];

    for (int index = 0; index < Products.Count; index++)
    {
      stampedProducts[index] = Products[index].WithSourceScanIndex(sourceScanIndex);
    }

    var stampedTaxes = new ReceiptTaxDocument[TaxDetails.Count];

    for (int index = 0; index < TaxDetails.Count; index++)
    {
      stampedTaxes[index] = TaxDetails[index].WithSourceScanIndex(sourceScanIndex);
    }

    var stampedPayments = new ReceiptPaymentLineDocument[Payments.Count];

    for (int index = 0; index < Payments.Count; index++)
    {
      stampedPayments[index] = Payments[index].WithSourceScanIndex(sourceScanIndex);
    }

    return new ReceiptDocument(
      merchant: Merchant.WithSourceScanIndex(sourceScanIndex),
      products: stampedProducts,
      payment: Payment.WithSourceScanIndex(sourceScanIndex),
      receiptType: ReceiptType.WithSourceScanIndex(sourceScanIndex),
      countryRegion: CountryRegion.WithSourceScanIndex(sourceScanIndex),
      taxDetails: stampedTaxes,
      payments: stampedPayments);
  }

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

  private static void ValidateSourceScanIndex(int sourceScanIndex)
  {
    if (sourceScanIndex < 0)
    {
      throw new ArgumentOutOfRangeException(
        nameof(sourceScanIndex),
        sourceScanIndex,
        "Source scan index must be greater than or equal to zero.");
    }
  }
}

/// <summary>
/// Represents one extracted field value together with confidence and source-scan provenance.
/// </summary>
/// <typeparam name="TValue">The extracted value type.</typeparam>
public sealed record DocumentValue<TValue>
{
  /// <summary>
  /// Initializes a new instance of the <see cref="DocumentValue{TValue}"/> record.
  /// </summary>
  /// <param name="value">The extracted field value.</param>
  /// <param name="confidence">The extraction confidence in the inclusive range [0, 1].</param>
  /// <param name="sourceScanIndex">
  /// The zero-based scan index that produced the value, or -1 when provenance has not yet been stamped.
  /// </param>
  public DocumentValue(TValue? value, double confidence, int sourceScanIndex)
  {
    if (sourceScanIndex < -1)
    {
      throw new ArgumentOutOfRangeException(
        nameof(sourceScanIndex),
        sourceScanIndex,
        "Source scan index must be -1 or greater.");
    }

    AnalysisContractGuards.RequireConfidence(confidence, nameof(confidence));

    Value = value;
    Confidence = confidence;
    SourceScanIndex = sourceScanIndex;
  }

  /// <summary>
  /// Gets the extracted field value.
  /// </summary>
  public TValue? Value { get; }

  /// <summary>
  /// Gets the extraction confidence in the inclusive range [0, 1].
  /// </summary>
  public double Confidence { get; }

  /// <summary>
  /// Gets the zero-based input scan index that produced this value, or -1 before stamping.
  /// </summary>
  public int SourceScanIndex { get; }

  /// <summary>
  /// Returns a copy of the current field value stamped with the supplied source scan index.
  /// </summary>
  /// <param name="sourceScanIndex">The zero-based input scan index.</param>
  /// <returns>A stamped copy of the current field value.</returns>
  public DocumentValue<TValue> WithSourceScanIndex(int sourceScanIndex) =>
    new(Value, Confidence, sourceScanIndex);
}

/// <summary>
/// Represents the provider-neutral merchant section extracted from a receipt scan.
/// </summary>
/// <param name="Name">The extracted merchant name field.</param>
/// <param name="Address">The extracted merchant address field.</param>
/// <param name="PhoneNumber">The extracted merchant phone-number field.</param>
public sealed record ReceiptMerchantDocument(
  DocumentValue<string> Name,
  DocumentValue<string> Address,
  DocumentValue<string> PhoneNumber)
{
  /// <summary>
  /// Returns a copy of the current merchant section stamped with the supplied source scan index.
  /// </summary>
  /// <param name="sourceScanIndex">The zero-based input scan index.</param>
  /// <returns>A stamped copy of the current merchant section.</returns>
  public ReceiptMerchantDocument WithSourceScanIndex(int sourceScanIndex) =>
    new(
      Name.WithSourceScanIndex(sourceScanIndex),
      Address.WithSourceScanIndex(sourceScanIndex),
      PhoneNumber.WithSourceScanIndex(sourceScanIndex));
}

/// <summary>
/// Represents one provider-neutral product line extracted from a receipt scan.
/// </summary>
/// <param name="Name">The extracted product-name field.</param>
/// <param name="Quantity">The extracted quantity field.</param>
/// <param name="QuantityUnit">The extracted quantity-unit field.</param>
/// <param name="ProductCode">The extracted product-code field.</param>
/// <param name="Price">The extracted unit-price field.</param>
/// <param name="TotalPrice">The extracted total-price field.</param>
/// <param name="Confidence">The extraction confidence for the product line.</param>
public sealed record ReceiptProductDocument(
  DocumentValue<string> Name,
  DocumentValue<decimal?> Quantity,
  DocumentValue<string> QuantityUnit,
  DocumentValue<string> ProductCode,
  DocumentValue<decimal?> Price,
  DocumentValue<decimal?> TotalPrice,
  double Confidence)
{
  /// <summary>
  /// Returns a copy of the current product line stamped with the supplied source scan index.
  /// </summary>
  /// <param name="sourceScanIndex">The zero-based input scan index.</param>
  /// <returns>A stamped copy of the current product line.</returns>
  public ReceiptProductDocument WithSourceScanIndex(int sourceScanIndex) =>
    new(
      Name.WithSourceScanIndex(sourceScanIndex),
      Quantity.WithSourceScanIndex(sourceScanIndex),
      QuantityUnit.WithSourceScanIndex(sourceScanIndex),
      ProductCode.WithSourceScanIndex(sourceScanIndex),
      Price.WithSourceScanIndex(sourceScanIndex),
      TotalPrice.WithSourceScanIndex(sourceScanIndex),
      Confidence);
}

/// <summary>
/// Represents the provider-neutral payment-information section extracted from a receipt scan.
/// </summary>
/// <param name="TransactionDate">The extracted transaction-date field.</param>
/// <param name="Currency">The extracted currency field.</param>
/// <param name="TotalAmount">The extracted total-amount field.</param>
/// <param name="TotalTaxAmount">The extracted total-tax field.</param>
/// <param name="SubtotalAmount">The extracted subtotal field.</param>
/// <param name="TipAmount">The extracted tip field.</param>
public sealed record ReceiptPaymentDocument(
  DocumentValue<DateTimeOffset?> TransactionDate,
  DocumentValue<Currency?> Currency,
  DocumentValue<decimal?> TotalAmount,
  DocumentValue<decimal?> TotalTaxAmount,
  DocumentValue<decimal?> SubtotalAmount,
  DocumentValue<decimal?> TipAmount)
{
  /// <summary>
  /// Returns a copy of the current payment section stamped with the supplied source scan index.
  /// </summary>
  /// <param name="sourceScanIndex">The zero-based input scan index.</param>
  /// <returns>A stamped copy of the current payment section.</returns>
  public ReceiptPaymentDocument WithSourceScanIndex(int sourceScanIndex) =>
    new(
      TransactionDate.WithSourceScanIndex(sourceScanIndex),
      Currency.WithSourceScanIndex(sourceScanIndex),
      TotalAmount.WithSourceScanIndex(sourceScanIndex),
      TotalTaxAmount.WithSourceScanIndex(sourceScanIndex),
      SubtotalAmount.WithSourceScanIndex(sourceScanIndex),
      TipAmount.WithSourceScanIndex(sourceScanIndex));
}

/// <summary>
/// Represents one provider-neutral tax line extracted from a receipt scan.
/// </summary>
/// <param name="Amount">The extracted tax-amount field.</param>
/// <param name="Rate">The extracted tax-rate field.</param>
/// <param name="NetAmount">The extracted tax net-amount field.</param>
/// <param name="Description">The extracted tax-description field.</param>
/// <param name="Confidence">The extraction confidence for the tax line.</param>
public sealed record ReceiptTaxDocument(
  DocumentValue<decimal?> Amount,
  DocumentValue<decimal?> Rate,
  DocumentValue<decimal?> NetAmount,
  DocumentValue<string> Description,
  double Confidence)
{
  /// <summary>
  /// Returns a copy of the current tax line stamped with the supplied source scan index.
  /// </summary>
  /// <param name="sourceScanIndex">The zero-based input scan index.</param>
  /// <returns>A stamped copy of the current tax line.</returns>
  public ReceiptTaxDocument WithSourceScanIndex(int sourceScanIndex) =>
    new(
      Amount.WithSourceScanIndex(sourceScanIndex),
      Rate.WithSourceScanIndex(sourceScanIndex),
      NetAmount.WithSourceScanIndex(sourceScanIndex),
      Description.WithSourceScanIndex(sourceScanIndex),
      Confidence);
}

/// <summary>
/// Represents one provider-neutral payment line extracted from a receipt scan.
/// </summary>
/// <param name="Method">The extracted payment-method field.</param>
/// <param name="Amount">The extracted payment-amount field.</param>
/// <param name="Confidence">The extraction confidence for the payment line.</param>
public sealed record ReceiptPaymentLineDocument(
  DocumentValue<string> Method,
  DocumentValue<decimal?> Amount,
  double Confidence)
{
  /// <summary>
  /// Returns a copy of the current payment line stamped with the supplied source scan index.
  /// </summary>
  /// <param name="sourceScanIndex">The zero-based input scan index.</param>
  /// <returns>A stamped copy of the current payment line.</returns>
  public ReceiptPaymentLineDocument WithSourceScanIndex(int sourceScanIndex) =>
    new(
      Method.WithSourceScanIndex(sourceScanIndex),
      Amount.WithSourceScanIndex(sourceScanIndex),
      Confidence);
}
