using System;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

/// <summary>
/// The invoice item record represents a single item from the invoice.
/// This record is used to store the invoice item information in the database.
/// The invoice item information is extracted from the invoice image using the OCR service.
/// </summary>
[Serializable]
public record class InvoiceItem
{
    /// <summary>
    /// The invoice item raw name (as seen on the digital invoice).
    /// The raw name is the name of the item as seen on the invoice.
    /// </summary>
    public required string RawName { get; set; } = string.Empty;

    /// <summary>
    /// The invoice item generic name (from "MONSTER ENERGY DRINK 50ML" to "ENERGY DRINK").
    /// The generic name thus represents a more general name for the item.
    /// </summary>
    public string GenericName { get; set; } = string.Empty;

    /// <summary>
    /// The invoice item category.
    /// See <see cref="InvoiceItemCategory"/> for the available categories.
    /// </summary>
    public InvoiceItemCategory Category { get; set; } = InvoiceItemCategory.OTHER;

    /// <summary>
    /// The item quantity.
    /// </summary>
    public required int Quantity { get; set; } = 0;

    /// <summary>
    /// The item quantity unit (e.g. kg, ml).
    /// The quantity unit is the unit of measurement for the item quantity.
    /// This field is optional.
    /// </summary>
    public string QuantityUnit { get; set; } = string.Empty;

    /// <summary>
    /// The item's product code (or SKU).
    /// The product code is a unique identifier for the item.
    /// This field is optional.
    /// </summary>
    public string ProductCode { get; set; } = string.Empty;

    /// <summary>
    /// The item's price; this field is marked as string since some items can have a price range (e.g. 1.99 - 2.99) or a pricer per unit (e.g. 1.99 / kg).
    /// The price is represents the price of a single item.
    /// </summary>
    public required decimal Price { get; set; } = 0.0M;

    /// <summary>
    /// The total price of the item, (Total = quantity x price).
    /// </summary>
    public required decimal TotalPrice { get; set; } = 0.0M;

}
