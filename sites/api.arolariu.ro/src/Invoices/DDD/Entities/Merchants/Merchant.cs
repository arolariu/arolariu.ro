namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
/// The invoice merchant record class represents the merchant information from the invoice.
/// The merchant information is extracted from the invoice image using the OCR service.
/// This record is used to store the merchant information in the database.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed class Merchant : NamedEntity<Guid>
{
	/// <inheritdoc/>
	[JsonPropertyName("id")]
	[JsonPropertyOrder(0)]
	public override Guid id { get; init; } = Guid.NewGuid();

	/// <summary>
	/// The merchant category.
	/// </summary>
	[JsonPropertyOrder(3)]
	public MerchantCategory Category { get; set; } = MerchantCategory.OTHER;

	/// <summary>
	/// The merchant address.
	/// </summary>
	[JsonPropertyOrder(4)]
	public ContactInformation Address { get; set; } = new ContactInformation();

	/// <summary>
	/// The merchant parent company.
	/// </summary>
	[JsonPropertyOrder(5)]
	public Guid ParentCompanyId { get; set; } = Guid.Empty;

	/// <summary>
	/// The list of invoices that reference this merchant.
	/// </summary>
	[JsonPropertyOrder(6)]
	public ICollection<Guid> ReferencedInvoices { get; init; } = new List<Guid>();

	/// <summary>
	/// Additional metadata about the merchant.
	/// </summary>
	[JsonPropertyOrder(7)]
	public IDictionary<string, string> AdditionalMetadata { get; init; } = new Dictionary<string, string>();
}
