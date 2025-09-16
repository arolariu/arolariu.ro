namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
/// The payment information record.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed record PaymentInformation
{
	/// <summary>
	/// The date of purchase.
	/// </summary>
	public DateTimeOffset TransactionDate { get; set; } = DateTimeOffset.Now;

	/// <summary>
	/// The payment type.
	/// </summary>
	public PaymentType PaymentType { get; set; } = PaymentType.UNKNOWN;

	/// <summary>
	/// The original currency.
	/// </summary>
	public Currency Currency { get; set; } = new Currency("Romanian Leu", "RON", "lei");

	/// <summary>
	/// The total amount, in the original currency.
	/// </summary>
	public decimal TotalCostAmount { get; set; } = 0.0m;

	/// <summary>
	/// The tax amount, in the original currency.
	/// </summary>
	public decimal TotalTaxAmount { get; set; } = 0.0m;
}

/// <summary>
/// The payment type enumeration.
/// </summary>
public enum PaymentType
{
	/// <summary>
	/// The payment type is unknown.
	/// </summary>
	UNKNOWN = 0,

	/// <summary>
	/// The payment type is via cash.
	/// </summary>
	CASH = 100,

	/// <summary>
	/// The payment type is via card.
	/// </summary>
	CARD = 200,

	/// <summary>
	/// The payment type is via bank transfer.
	/// </summary>
	TRANSFER = 300,

	/// <summary>
	/// The payment type is via mobile payment.
	/// </summary>
	MOBILEPAYMENT = 400,

	/// <summary>
	/// The payment type is via voucher(s).
	/// </summary>
	VOUCHER = 500,

	/// <summary>
	/// The payment type is other.
	/// </summary>
	Other = 9999,
}
