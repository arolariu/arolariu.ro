using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage] // Entities are not tested - they are used to represent the data in the application domain.
public sealed class Invoice
{
    /// <summary>
    /// The invoice id.
    /// </summary>
#pragma warning disable IDE1006 // Naming Styles - CosmosDB requires this field to be lowercase.
    // TODO: need to investigate why CosmosDB requires this field to be lowercase.
    public required Guid id { get; set; } = Guid.NewGuid();
#pragma warning restore IDE1006 // Naming Styles

    /// <summary>
    /// The invoice currency code - 3 letters - EUR, RON, SEK.
    /// </summary>
    public required Currency Currency { get; set; }

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
    public IEnumerable<Recipe> PossibleRecipes { get; set; } = null!;

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

    /// <summary>
    /// The invoice time information.
    /// </summary>
    public InvoiceTimeInformation TimeInformation { get; set; }

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
        return new Invoice
        {
            id = Guid.Empty,
            Currency = new Currency(),
            TotalAmount = decimal.MinValue,
            TotalTax = decimal.MinValue,
            Description = "This is a null invoice; please correct/delete.",
            EstimatedSurvivalDays = int.MinValue,
            PossibleRecipes = new List<Recipe>(),
            UserIdentifier = Guid.Empty,
            Merchant = new Merchant(),
            Items = new List<Product>(),
            TimeInformation = new InvoiceTimeInformation(),
            AdditionalMetadata = new List<KeyValuePair<string, object>>()
        };
    }

    /// <summary>
    /// Method that takes an invoice and checks if it is a null object.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns>`True` if the object is null; otherwise `False`.</returns>
    public static bool CheckForNullObject(Invoice invoice)
        => invoice == null || invoice.id == Guid.Empty;

    /// <inheritdoc/>
    public override bool Equals(object? obj)
    {
        if (obj is not Invoice invoice) return false;
        return id.Equals(invoice.id);
    }

    /// <inheritdoc/>
    public override int GetHashCode()
    {
        return HashCode.Combine(id);
    }
}