namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
/// Value object capturing transactional payment attributes associated with an invoice.
/// </summary>
/// <remarks>
/// <para>Encapsulates temporal data (<c>TransactionDate</c>), tender metadata (<c>PaymentType</c>), monetary breakdown (<c>TotalCostAmount</c>, <c>TotalTaxAmount</c>)
/// and currency context (<c>Currency</c>).</para>
/// <para><b>Mutability:</b> Mutable to allow progressive enrichment (post-OCR correction, currency normalization). Treated as an owned value object in persistence.</para>
/// <para><b>Time Zone:</b> <c>TransactionDate</c> currently seeded with local system time via <see cref="DateTimeOffset.Now"/>; consider migrating to <see cref="DateTimeOffset.UtcNow"/>
/// to prevent cross-time zone skew.</para>
/// <para><b>Thread-safety:</b> Not thread-safe; confine to aggregate mutation scope.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed record PaymentInformation
{
	/// <summary>Point-in-time at which the purchase was executed (store local time).</summary>
	/// <remarks><para>May differ from ingestion time. Use for chronological analytics and interval bucketing.</para></remarks>
	public DateTimeOffset TransactionDate { get; set; } = DateTimeOffset.Now;

	/// <summary>Mode / instrument used to settle the transaction.</summary>
	/// <remarks><para>Defaults to <see cref="PaymentType.UNKNOWN"/> when not inferable from OCR or receipt metadata.</para></remarks>
	public PaymentType PaymentType { get; set; } = PaymentType.UNKNOWN;

	/// <summary>Original settlement currency.</summary>
	/// <remarks><para>Represents ISO-like metadata (name, code, symbol). Values SHOULD remain stable for historical financial accuracy.</para></remarks>
	public Currency Currency { get; set; } = new Currency("Romanian Leu", "RON", "lei");

	/// <summary>Gross total payable amount (inclusive of tax) expressed in <see cref="Currency"/>.</summary>
	/// <remarks><para>Non-negative. Zero indicates incomplete enrichment or parsing failure.</para></remarks>
	public decimal TotalCostAmount { get; set; } = 0.0m;

	/// <summary>Tax component of the total amount in <see cref="Currency"/>.</summary>
	/// <remarks><para>May be zero for tax-exempt purchases or when parsing failed to isolate tax line items.</para></remarks>
	public decimal TotalTaxAmount { get; set; } = 0.0m;
}

/// <summary>
/// Enumerates supported payment settlement methods.
/// </summary>
/// <remarks>
/// <para><b>Extensibility:</b> Reserve numeric spacing (increments of 100) for future methods; sentinel <see cref="UNKNOWN"/> indicates unresolved extraction.</para>
/// <para><b>Analytics:</b> Drives spend channel distribution reporting and potential loyalty program inference.</para>
/// </remarks>
public enum PaymentType
{
	/// <summary>Sentinel; payment method not resolved from source.</summary>
	UNKNOWN = 0,

	/// <summary>Physical cash tender.</summary>
	CASH = 100,

	/// <summary>Payment card (credit / debit).</summary>
	CARD = 200,

	/// <summary>Bank (wire / ACH / SEPA-like) transfer.</summary>
	TRANSFER = 300,

	/// <summary>Mobile wallet / NFC application (e.g. device-based tokenized payment).</summary>
	MOBILEPAYMENT = 400,

	/// <summary>Voucher / coupon / prepaid certificate redemption.</summary>
	VOUCHER = 500,

	/// <summary>Fallback when no defined payment method applies.</summary>
	Other = 9999,
}
