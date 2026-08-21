namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Represents one payment record extracted from an invoice receipt.
/// </summary>
/// <param name="Method">The receipt-provided payment-method label.</param>
/// <param name="Amount">The amount settled using the payment method.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PaymentDetailResponseDto(
  [property: JsonPropertyName("method")] string Method,
  [property: JsonPropertyName("amount")] decimal Amount)
{
  /// <summary>
  /// Projects a payment detail into its public transport representation.
  /// </summary>
  /// <param name="paymentDetail">The payment detail to project.</param>
  /// <returns>An immutable payment-detail response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="paymentDetail"/> is null.</exception>
  public static PaymentDetailResponseDto FromPaymentDetail(PaymentDetail paymentDetail)
  {
    ArgumentNullException.ThrowIfNull(paymentDetail);
    return new(paymentDetail.Method, paymentDetail.Amount);
  }
}
