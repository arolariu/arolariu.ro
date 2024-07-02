namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

/// <summary>
/// The invoice merchant record class represents the merchant information from the invoice.
/// The merchant information is extracted from the invoice image using the OCR service.
/// This record is used to store the merchant information in the database.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed class Merchant : NamedEntity<Guid>
{
	/// <summary>
	/// The merchant category.
	/// </summary>
	[JsonPropertyOrder(3)]
	public MerchantCategory Category { get; set; } = MerchantCategory.OTHER;

	/// <summary>
	/// The merchant address.
	/// </summary>
	[JsonPropertyOrder(4)]
	public string Address { get; set; } = string.Empty;

	/// <summary>
	/// The merchant phone number.
	/// </summary>
	[JsonPropertyOrder(5)]
	public string PhoneNumber { get; set; } = string.Empty;

	/// <summary>
	/// The merchant parent company.
	/// The parent company is used to generate the invoice statistics.
	/// </summary>
	[JsonPropertyOrder(6)]
	public Guid ParentCompanyId { get; set; }

	/// <summary>
	/// Navigation property for invoices.
	/// </summary>
	[JsonIgnore]
	public ICollection<Invoice> Invoices { get; } = new List<Invoice>();

	/// <summary>
	/// Parameterless constructor.
	/// </summary>
	public Merchant()
	{
		Id = Guid.NewGuid();
		Name = string.Empty;
		Description = string.Empty;
		Category = MerchantCategory.OTHER;
		Address = string.Empty;
		PhoneNumber = string.Empty;
		ParentCompanyId = Guid.Empty;
		Invoices = new List<Invoice>();
	}
}
