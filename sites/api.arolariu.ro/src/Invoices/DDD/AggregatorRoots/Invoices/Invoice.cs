namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;


using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[ExcludeFromCodeCoverage] // Entities are not tested - they are used to represent the data in the application domain.
public sealed class Invoice : NamedEntity<Guid>, ICloneable, IEquatable<Invoice>
{
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
	public PaymentInformation PaymentInformation { get; set; }

	/// <summary>
	/// The invoice 1:1? merchant relationship.
	/// </summary>
	[JsonPropertyOrder(7)]
	public Merchant Merchant { get; set; } = null!;

	/// <summary>
	/// The invoice 1:*? - item relationship.
	/// </summary>
	[JsonPropertyOrder(8)]
	public IEnumerable<Product> Items { get; set; } = new List<Product>();

	/// <summary>
	/// Possible recipes for the invoice.
	/// </summary>
	[JsonPropertyOrder(9)]
	public IEnumerable<Recipe> PossibleRecipes { get; set; } = new List<Recipe>();

	/// <summary>
	/// The invoice additional metadata.
	/// This metadata is used to store additional information about the invoice.
	/// Metadata is used to generate the invoice statistics.
	/// </summary>
	[JsonPropertyOrder(11)]
	public IEnumerable<KeyValuePair<string, object>> AdditionalMetadata { get; set; } = new List<KeyValuePair<string, object>>();

	/// <inheritdoc/>
	public bool Equals(Invoice? other) => Equals(other as object);

	/// <inheritdoc/>
	public override bool Equals(object? obj)
	{
		if (obj is not Invoice other) return false;
		return
			Id.Equals(other.Id) &&
			UserIdentifier.Equals(other.UserIdentifier);
	}

	/// <inheritdoc/>
	public override int GetHashCode()
	{
		return HashCode.Combine(Id, UserIdentifier);
	}

	/// <inheritdoc/>
	public object Clone()
	{
		return new Invoice
		{
			Id = Id,
			Name = Name,
			Description = Description,
			CreatedAt = CreatedAt,
			CreatedBy = CreatedBy,
			IsImportant = IsImportant,
			IsSoftDeleted = IsSoftDeleted,
			LastUpdatedAt = LastUpdatedAt,
			LastUpdatedBy = LastUpdatedBy,
			NumberOfUpdates = NumberOfUpdates,
			UserIdentifier = UserIdentifier,
			Category = Category,
			PhotoLocation = PhotoLocation,
			Merchant = Merchant, // intentionally shallow copy - merchant is an independent entity and should not be race condition prone
			Items = new List<Product>(Items),
			PossibleRecipes = new List<Recipe>(PossibleRecipes),
			AdditionalMetadata = new List<KeyValuePair<string, object>>(AdditionalMetadata),
			PaymentInformation = new PaymentInformation
			{
				Currency = PaymentInformation.Currency,
				TotalAmount = PaymentInformation.TotalAmount,
				TotalTax = PaymentInformation.TotalTax
			},
		};
	}
}
