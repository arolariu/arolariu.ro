﻿namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// The invoice item record represents a single item from the invoice.
/// This record is used to store the invoice item information in the database.
/// The invoice item information is extracted from the invoice image using the OCR service.
/// </summary>
[Owned]
[ExcludeFromCodeCoverage]
public class Product
{
	/// <summary>
	/// The invoice item raw name (as seen on the digital invoice).
	/// The raw name is the name of the item as seen on the invoice.
	/// </summary>
	[JsonPropertyOrder(0)]
	public string RawName { get; set; } = string.Empty;

	/// <summary>
	/// The invoice item generic name (from "MONSTER ENERGY DRINK 50ML" to "ENERGY DRINK").
	/// The generic name thus represents a more general name for the item.
	/// </summary>
	[JsonPropertyOrder(1)]
	public string GenericName { get; set; } = string.Empty;

	/// <summary>
	/// The invoice item category.
	/// See <see cref="ProductCategory"/> for the available categories.
	/// </summary>
	[JsonPropertyOrder(2)]
	public ProductCategory Category { get; set; } = ProductCategory.OTHER;

	/// <summary>
	/// The item quantity.
	/// </summary>
	[JsonPropertyOrder(3)]
	public decimal Quantity { get; set; } = 0;

	/// <summary>
	/// The item quantity unit (e.g. kg, ml).
	/// The quantity unit is the unit of measurement for the item quantity.
	/// This field is optional.
	/// </summary>
	[JsonPropertyOrder(4)]
	public string QuantityUnit { get; set; } = string.Empty;

	/// <summary>
	/// The item's product code (or SKU).
	/// The product code is a unique identifier for the item.
	/// This field is optional.
	/// </summary>
	[JsonPropertyOrder(5)]
	public string ProductCode { get; set; } = string.Empty;

	/// <summary>
	/// The item's price; this field is marked as string since some items can have a price range (e.g. 1.99 - 2.99) or a price per unit (e.g. 1.99 / kg).
	/// The price is represents the price of a single item.
	/// </summary>
	[JsonPropertyOrder(6)]
	public decimal Price { get; set; } = 0;

	/// <summary>
	/// The total price of the item, (Total = quantity x price).
	/// </summary>
	[JsonIgnore]
	public decimal TotalPrice => Quantity * Price;

	/// <summary>
	/// The product's detected allergens.
	/// </summary>
	[JsonPropertyOrder(7)]
	public IEnumerable<Allergen> DetectedAllergens { get; set; } = new List<Allergen>();

	/// <summary>
	/// Product metadata.
	/// </summary>
	[JsonPropertyOrder(8)]
	public ProductMetadata Metadata { get; set; }
}
