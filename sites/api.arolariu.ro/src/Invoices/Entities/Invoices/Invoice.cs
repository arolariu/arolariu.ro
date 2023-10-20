using arolariu.Backend.Domain.Invoices.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.Entities.Products;

using System;
using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Entities.Invoices;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[Serializable]
public record class Invoice
{
    /// <summary>
    /// The invoice id.
    /// </summary>
#pragma warning disable IDE1006 // Naming Styles - CosmosDB requires this field to be lowercase.
    // TODO: need to investigate why CosmosDB requires this field to be lowercase.
    public required Guid id { get; set; } = Guid.NewGuid();
#pragma warning restore IDE1006 // Naming Styles

    /// <summary>
    /// The invoice image URI.
    /// </summary>
    public required Uri ImageLocation { get; set; } = null!;

    /// <summary>
    /// The invoice currency code - 3 letters - EUR, RON, SEK.
    /// </summary>
    public required string Currency { get; set; } = string.Empty;

    /// <summary>
    /// The invoice total amount (TOTAL = SUM(boughtItems) - SUM(discountedItems)).
    /// </summary>
    public required decimal TotalAmount { get; set; } = 0.0M;

    /// <summary>
    /// The invoice total tax.
    /// </summary>
    public required decimal TotalTax { get; set; } = 0.0M;

    /// <summary>
    /// The invoice description, as suggested by the user.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// How many days can you survive with the invoice items?
    /// </summary>
    public int EstimatedSurvivalDays { get; set; } = int.MinValue;

    /// <summary>
    /// Possible recipes for the invoice.
    /// </summary>
    public IEnumerable<string> PossibleRecipes { get; set; } = null!;

    #region Foreign Keys
    /// <summary>
    /// The invoice 1:1? user relationship.
    /// </summary>
    public Guid UserIdentifier { get; set; } = Guid.Empty;

    /// <summary>
    /// The invoice 1:1? merchant relationship.
    /// </summary>
    public Merchant Merchant { get; set; } = null!;

    /// <summary>
    /// The invoice 1:*? - item relationship.
    /// </summary>
    public IEnumerable<Product> Items { get; set; } = null!;
    #endregion

    #region Invoice time information
    /// <summary>
    /// The invoice uploaded date (in the system).
    /// </summary>
    public required DateTimeOffset UploadedDate { get; set; } = DateTimeOffset.MinValue;

    /// <summary>
    /// The invoice identified date (from OCR service).
    /// </summary>
    public required DateTimeOffset DateOfPurchase { get; set; } = DateTimeOffset.MinValue;

    /// <summary>
    /// The invoice last modified date.
    /// </summary>
    public required DateTimeOffset LastModifiedDate { get; set; } = DateTimeOffset.MinValue;

    /// <summary>
    /// The invoice last analyzed date.
    /// </summary>
    public required DateTimeOffset DateOfAnalysis { get; set; } = DateTimeOffset.MinValue;
    #endregion

    /// <summary>
    /// The invoice metadata.
    /// This metadata is used to store system-assigned and user-assigned metadata.
    /// </summary>
    public InvoiceMetadata Metadata { get; set; }

    /// <summary>
    /// The invoice additional metadata.
    /// This metadata is used to store additional information about the invoice.
    /// Metadata is used to generate the invoice statistics.
    /// </summary>
    public IEnumerable<KeyValuePair<string, object>> AdditionalMetadata { get; set; } = null!;


    /// <summary>
    /// Null Object design pattern implementation for the <see cref="Invoice"/> class.
    /// </summary>
    /// <returns></returns>
    public static Invoice CreateNullInvoice()
    {
#pragma warning disable S1075 // URIs should not be hardcoded
        return new Invoice
        {
            id = Guid.Empty,
            ImageLocation = new Uri("https://www.arolariu.ro/null"),
            Currency = "###",
            TotalAmount = decimal.MinValue,
            TotalTax = decimal.MinValue,
            Description = "This is a null invoice; please correct/delete.",
            EstimatedSurvivalDays = int.MinValue,
            PossibleRecipes = new List<string>(),
            UserIdentifier = Guid.Empty,
            Merchant = new Merchant(),
            Items = new List<Product>(),
            UploadedDate = DateTimeOffset.MinValue,
            DateOfPurchase = DateTimeOffset.MinValue,
            LastModifiedDate = DateTimeOffset.MinValue,
            DateOfAnalysis = DateTimeOffset.MinValue,
            AdditionalMetadata = new List<KeyValuePair<string, object>>()
        };
#pragma warning restore S1075 // URIs should not be hardcoded
    }

    /// <summary>
    /// Method that takes an invoice and checks if it is a null object.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns>`True` if the object is null; otherwise `False`.</returns>
    public static bool CheckForNullObject(Invoice invoice)
        => invoice == null || invoice.id == Guid.Empty;
}