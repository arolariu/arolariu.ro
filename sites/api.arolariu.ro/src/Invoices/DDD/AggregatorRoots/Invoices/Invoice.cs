namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[ExcludeFromCodeCoverage] // Entities are not tested - they are used to represent the data in the application domain.
public sealed class Invoice : NamedEntity<Guid>
{
	/// <inheritdoc/>
	[JsonPropertyName("id")]
	[JsonPropertyOrder(0)]
	public override required Guid id { get; init; }

	/// <summary>
	/// The invoice 1:1 user relationship (owner).
	/// </summary>
	[JsonPropertyOrder(3)]
	public required Guid UserIdentifier { get; set; }

	/// <summary>
	/// The invoice category.
	/// </summary>
	[JsonPropertyOrder(4)]
	public InvoiceCategory Category { get; set; } = InvoiceCategory.NOT_DEFINED;

	/// <summary>
	/// The invoice photo location.
	/// </summary>
	[JsonPropertyOrder(5)]
	public required Uri PhotoLocation { get; set; }

	/// <summary>
	/// Payment information (currency, total amount, total tax).
	/// </summary>
	[JsonPropertyOrder(6)]
	public PaymentInformation PaymentInformation { get; set; } = null!;

	/// <summary>
	/// The invoice 1:1? merchant relationship.
	/// </summary>
	[JsonPropertyOrder(7)]
	public Merchant Merchant { get; set; } = null!;

	/// <summary>
	/// The invoice 1:*? - item relationship.
	/// </summary>
	[JsonPropertyOrder(8)]
#pragma warning disable CA2227 // Collection properties should be read only
	public ICollection<Product> Items { get; set; } = new List<Product>();

	/// <summary>
	/// Possible recipes for the invoice.
	/// </summary>
	[JsonPropertyOrder(9)]
	public ICollection<Recipe> PossibleRecipes { get; set; } = new List<Recipe>();
#pragma warning restore CA2227 // Collection properties should be read only

	/// <summary>
	/// The invoice additional metadata.
	/// This metadata is used to store additional information about the invoice.
	/// Metadata is used to generate the invoice statistics.
	/// </summary>
	[JsonPropertyOrder(10)]
	public IDictionary<string, string> AdditionalMetadata { get; private set; } = new Dictionary<string, string>();
}
