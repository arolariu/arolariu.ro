namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Microsoft.EntityFrameworkCore;

using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

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
	public int Quantity { get; set; } = int.MinValue;

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
	/// The item's price; this field is marked as string since some items can have a price range (e.g. 1.99 - 2.99) or a pricer per unit (e.g. 1.99 / kg).
	/// The price is represents the price of a single item.
	/// </summary>
	[JsonPropertyOrder(6)]
	public decimal Price { get; set; } = decimal.MinValue;

	/// <summary>
	/// The total price of the item, (Total = quantity x price).
	/// </summary>
	[JsonPropertyOrder(7)]
	public decimal TotalPrice { get; set; } = decimal.MinValue;

	/// <summary>
	/// The product's detected allergens.
	/// </summary>
	[JsonPropertyOrder(8)]
	public IEnumerable<Allergen> DetectedAllergens { get; } = new List<Allergen>();

	/// <summary>
	/// Product metadata.
	/// </summary>
	[JsonPropertyOrder(9)]
	[Column(Order = 9)]
	public ProductMetadata Metadata { get; set; }
}
