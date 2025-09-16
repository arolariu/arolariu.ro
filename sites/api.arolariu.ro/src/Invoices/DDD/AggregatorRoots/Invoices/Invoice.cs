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
	[SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Set is only exposed for tests.")]
	public ICollection<Product> Items { get; set; } = new List<Product>();

	/// <summary>
	/// Possible recipes for the invoice.
	/// </summary>
	[JsonPropertyOrder(10)]
	[SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Set is only exposed for tests.")]
	public ICollection<Recipe> PossibleRecipes { get; set; } = new List<Recipe>();

	/// <summary>
	/// The invoice additional metadata.
	/// This metadata is used to store additional information about the invoice.
	/// Metadata is used to generate the invoice statistics.
	/// </summary>
	[JsonPropertyOrder(11)]
	[SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Set is only exposed for tests.")]
	public IDictionary<string, string> AdditionalMetadata { get; set; } = new Dictionary<string, string>();

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

	/// <summary>
	/// Static method that merges two invoices, the original and the partial updates.
	/// The method returns a new invoice that is the result of merging the two invoices.
	/// </summary>
	/// <param name="original"></param>
	/// <param name="partialUpdates"></param>
	/// <returns></returns>
	internal static Invoice Merge(Invoice original, Invoice partialUpdates)
	{
		var newInvoice = new Invoice
		{
			id = original.id, // The identifier remains the same.
			UserIdentifier = partialUpdates.UserIdentifier != Guid.Empty ? partialUpdates.UserIdentifier : original.UserIdentifier,
			Category = partialUpdates.Category != InvoiceCategory.NOT_DEFINED ? partialUpdates.Category : original.Category,
			Name = !string.IsNullOrWhiteSpace(partialUpdates.Name) ? partialUpdates.Name : original.Name,
			Description = !string.IsNullOrWhiteSpace(partialUpdates.Description) ? partialUpdates.Description : original.Description,
			IsImportant = partialUpdates.IsImportant != original.IsImportant ? partialUpdates.IsImportant : original.IsImportant,
			LastUpdatedAt = DateTime.UtcNow,
			Scan = InvoiceScan.NotDefault(partialUpdates.Scan) ? partialUpdates.Scan : original.Scan,
			PaymentInformation = partialUpdates.PaymentInformation ?? original.PaymentInformation,
			MerchantReference = partialUpdates.MerchantReference != Guid.Empty ? partialUpdates.MerchantReference : original.MerchantReference,
			PossibleRecipes = partialUpdates.PossibleRecipes.Count > 0 ? [.. partialUpdates.PossibleRecipes, .. original.PossibleRecipes] : original.PossibleRecipes,
			SharedWith = partialUpdates.SharedWith.Count > 0 ? [.. partialUpdates.SharedWith, .. original.SharedWith] : original.SharedWith,
			NumberOfUpdates = original.NumberOfUpdates + 1,
		};

		if (partialUpdates.AdditionalMetadata is not null && partialUpdates.AdditionalMetadata.Count > 0)
		{
			newInvoice.AdditionalMetadata = new Dictionary<string, string>(original.AdditionalMetadata);
			foreach (var (key, value) in partialUpdates.AdditionalMetadata)
			{
				newInvoice.AdditionalMetadata[key] = value;
			}
		}

		if (partialUpdates.Items is not null && partialUpdates.Items.Count > 0)
		{
			newInvoice.Items = [.. original.Items, .. partialUpdates.Items];
		}

		if (partialUpdates.PossibleRecipes is not null && partialUpdates.PossibleRecipes.Count > 0)
		{
			newInvoice.PossibleRecipes = [.. original.PossibleRecipes, .. partialUpdates.PossibleRecipes];
		}

		return newInvoice;
	}
}
