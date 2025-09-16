namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[ExcludeFromCodeCoverage] // Entities are not tested - they are used to represent the data in the application domain.
public sealed class Invoice : NamedEntity<Guid>
{
	/// <inheritdoc/>
	[JsonPropertyName("id")]
	[JsonPropertyOrder(0)]
	public override required Guid id { get; init; } = Guid.CreateVersion7();

	/// <summary>
	/// The invoice 1:1 user relationship (owner).
	/// </summary>
	[JsonPropertyOrder(3)]
	public required Guid UserIdentifier { get; set; } = Guid.Empty;

	/// <summary>
	/// The list of users that have access to this invoice.
	/// </summary>
	[JsonPropertyOrder(4)]
	public ICollection<Guid> SharedWith { get; init; } = new List<Guid>();

	/// <summary>
	/// The invoice category.
	/// </summary>
	[JsonPropertyOrder(5)]
	public InvoiceCategory Category { get; set; } = InvoiceCategory.NOT_DEFINED;

	/// <summary>
	/// The invoice scan value object.
	/// </summary>
	[JsonPropertyOrder(6)]
	public InvoiceScan Scan { get; set; } = InvoiceScan.Default();

	/// <summary>
	/// Payment information (currency, total amount, total tax).
	/// </summary>
	[JsonPropertyOrder(7)]
	public PaymentInformation PaymentInformation { get; set; } = new PaymentInformation();

	/// <summary>
	/// The invoice's possible merchant relationship.
	/// </summary>
	[JsonPropertyOrder(8)]
	public Guid MerchantReference { get; set; } = Guid.Empty;

	/// <summary>
	/// The invoice 1:*? - item relationship.
	/// </summary>
	[JsonPropertyOrder(9)]
	public ICollection<Product> Items { get; init; } = new List<Product>();

	/// <summary>
	/// Possible recipes for the invoice.
	/// </summary>
	[JsonPropertyOrder(10)]
	public ICollection<Recipe> PossibleRecipes { get; init; } = new List<Recipe>();

	/// <summary>
	/// The invoice additional metadata.
	/// This metadata is used to store additional information about the invoice.
	/// Metadata is used to generate the invoice statistics.
	/// </summary>
	[JsonPropertyOrder(11)]
	public IDictionary<string, string> AdditionalMetadata { get; private set; } = new Dictionary<string, string>();

	/// <summary>
	/// Creates a new instance of the Invoice with default values.
	/// </summary>
	/// <returns></returns>
	internal static Invoice Default()
	{
		return new Invoice
		{
			id = Guid.CreateVersion7(),
			UserIdentifier = Guid.Empty,
			Category = InvoiceCategory.NOT_DEFINED,
			Scan = InvoiceScan.Default(),
			PaymentInformation = new PaymentInformation(),
			MerchantReference = Guid.Empty,
			AdditionalMetadata = new Dictionary<string, string>(),
		};
	}
}
