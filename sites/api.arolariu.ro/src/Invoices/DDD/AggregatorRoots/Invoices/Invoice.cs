using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

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
    public required Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The tracking number used by Cosmos DB.
    /// </summary>
    public int? TrackingNumber { get; set; }
    /// <summary>
    /// The invoice photo location.
    /// </summary>
    public required Uri PhotoLocation { get; set; } = null!;

    /// <summary>
    /// The invoice description, as suggested by the user.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Payment information (currency, total amount, total tax).
    /// </summary>
    public required PaymentInformation PaymentInformation { get; set; }

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
    [SuppressMessage("Minor Code Smell", "S1075:URIs should not be hardcoded", Justification = "Null Object pattern")]
    public static Invoice CreateNullInvoice()
    {
        return new Invoice
        {
            Id = Guid.Empty,
            UserIdentifier = Guid.Empty,
            PhotoLocation = new Uri("https://arolariu.ro/404"),
            PaymentInformation = new PaymentInformation(),
            Description = "This is a null invoice; please correct/delete.",
            EstimatedSurvivalDays = int.MinValue,
            PossibleRecipes = new List<Recipe>(),
            Merchant = new Merchant(),
            Items = new List<Product>(),
            TimeInformation = new InvoiceTimeInformation(),
            Metadata = new InvoiceMetadata(),
            AdditionalMetadata = new List<KeyValuePair<string, object>>()
        };
    }

    /// <summary>
    /// Method used to update the invoice with the data from another invoice.
    /// </summary>
    /// <param name="other"></param>
    /// <returns></returns>
    public Invoice Update(Invoice other)
    {
        ArgumentNullException.ThrowIfNull(other);

        this.PhotoLocation = other.PhotoLocation;
        this.Description = other.Description;
        this.PaymentInformation = other.PaymentInformation;
        this.EstimatedSurvivalDays = other.EstimatedSurvivalDays;
        this.PossibleRecipes = other.PossibleRecipes;
        this.Merchant = other.Merchant;
        this.Items = other.Items;
        this.TimeInformation = other.TimeInformation;
        this.Metadata = other.Metadata;
        this.AdditionalMetadata = other.AdditionalMetadata;

        return this;
    }

    /// <summary>
    /// Method that takes an invoice and checks if it is a null object.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns>`True` if the object is null; otherwise `False`.</returns>
    public static bool CheckForNullObject(Invoice invoice) =>
        invoice == null || invoice.Id == Guid.Empty;

    /// <inheritdoc/>
    public override bool Equals(object? obj)
    {
        if (obj is not Invoice invoice) return false;
        return Id.Equals(invoice.Id);
    }

    /// <inheritdoc/>
    public override int GetHashCode()
    {
        return HashCode.Combine(Id);
    }
}
