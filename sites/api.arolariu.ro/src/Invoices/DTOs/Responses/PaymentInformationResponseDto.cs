namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Represents the public payment information associated with an invoice.
/// </summary>
/// <param name="TransactionDate">The transaction time supplied by the receipt.</param>
/// <param name="PaymentType">The extracted payment type.</param>
/// <param name="Currency">The currency in which all amounts are expressed.</param>
/// <param name="TotalCostAmount">The gross total amount including tax.</param>
/// <param name="TotalTaxAmount">The total tax component of the transaction.</param>
/// <param name="SubtotalAmount">The pre-tax subtotal, or zero when unavailable.</param>
/// <param name="TipAmount">The gratuity amount, or zero when unavailable.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PaymentInformationResponseDto(
  [property: JsonPropertyName("transactionDate")] DateTimeOffset TransactionDate,
  [property: JsonPropertyName("paymentType")] PaymentType PaymentType,
  [property: JsonPropertyName("currency")] CurrencyResponseDto Currency,
  [property: JsonPropertyName("totalCostAmount")] decimal TotalCostAmount,
  [property: JsonPropertyName("totalTaxAmount")] decimal TotalTaxAmount,
  [property: JsonPropertyName("subtotalAmount")] decimal SubtotalAmount,
  [property: JsonPropertyName("tipAmount")] decimal TipAmount)
{
  /// <summary>
  /// Projects payment information into its public transport representation.
  /// </summary>
  /// <param name="paymentInformation">The payment information to project.</param>
  /// <returns>An immutable payment-information response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="paymentInformation"/> is null.</exception>
  public static PaymentInformationResponseDto FromPaymentInformation(PaymentInformation paymentInformation)
  {
    ArgumentNullException.ThrowIfNull(paymentInformation);
    return new(
      TransactionDate: paymentInformation.TransactionDate,
      PaymentType: paymentInformation.PaymentType,
      Currency: CurrencyResponseDto.FromCurrency(paymentInformation.Currency),
      TotalCostAmount: paymentInformation.TotalCostAmount,
      TotalTaxAmount: paymentInformation.TotalTaxAmount,
      SubtotalAmount: paymentInformation.SubtotalAmount,
      TipAmount: paymentInformation.TipAmount);
  }
}
