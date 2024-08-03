namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The payment information record.
/// </summary>
[ExcludeFromCodeCoverage]
public record PaymentInformation
{
	/// <summary>
	/// The date of purchase.
	/// </summary>
	public DateTimeOffset DateOfPurchase {get;set;}

	/// <summary>
	/// The payment type.
	/// </summary>
	public PaymentType PaymentType {get;set;}

	/// <summary>
	/// The currency name.
	/// </summary>
	public string CurrencyName {get;set;} = "N/A";

	/// <summary>
	/// The currency symbol.
	/// </summary>
	public string CurrencySymbol {get;set;} = string.Empty;

	/// <summary>
	/// The total amount.
	/// </summary>
	public decimal TotalAmount {get;set;} = 0;

	/// <summary>
	/// The total tax.
	/// </summary>
	public decimal TotalTax { get; set; } = 0;

	/// <summary>
	/// Parameterless constructor.
	/// </summary>
	public PaymentInformation()
	{
	}
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
	/// The payment type is cash.
	/// </summary>
	CASH = 1,

	/// <summary>
	/// The payment type is card.
	/// </summary>
	CARD = 2,

	/// <summary>
	/// The payment type is transfer.
	/// </summary>
	TRANSFER = 3
}
