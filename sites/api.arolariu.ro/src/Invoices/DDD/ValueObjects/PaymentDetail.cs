namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// Represents a single payment method and amount used in a transaction.
/// </summary>
/// <remarks>
/// <para>Receipts may record multiple payment methods (e.g., partial cash + card).
/// Each <c>PaymentDetail</c> captures one method and its amount.</para>
/// <para><b>Source:</b> Azure Document Intelligence v4.0 <c>prebuilt-receipt</c> model — <c>Payments</c> array field.</para>
/// </remarks>
[Serializable]
[Owned]
public sealed record PaymentDetail
{
  /// <summary>The payment method (e.g., "Cash", "Credit Card", "Debit Card", "Mobile Payment").</summary>
  public string Method { get; set; } = string.Empty;

  /// <summary>The amount paid via this method.</summary>
  public decimal Amount { get; set; } = 0.0m;
}
