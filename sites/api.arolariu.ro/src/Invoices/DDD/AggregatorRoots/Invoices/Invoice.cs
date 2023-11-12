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
    public required Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The invoice 1:1 user relationship.
    /// </summary>
    public required Guid UserIdentifier { get; set; }

    /// <summary>
    /// The invoice photo location.
    /// </summary>
    public required Uri PhotoLocation { get; set; }

    /// <summary>
    /// The invoice description, as suggested by the user.
    /// </summary>
    public required string Description { get; set; }

    /// <summary>
    /// The invoice time information.
    /// </summary>
    public required InvoiceTimeInformation TimeInformation { get; set; }

    /// <summary>
    /// Payment information (currency, total amount, total tax).
    /// </summary>
    public required PaymentInformation PaymentInformation { get; set; }

    /// <summary>
    /// The invoice 1:1? merchant relationship.
    /// </summary>
    public required Merchant Merchant { get; set; }

    /// <summary>
    /// The invoice 1:*? - item relationship.
    /// </summary>
    public required IEnumerable<Product> Items { get; set; }

    /// <summary>
    /// Possible recipes for the invoice.
    /// </summary>
    public required IEnumerable<Recipe> PossibleRecipes { get; set; }

    /// <summary>
    /// How many days can you survive with the invoice items?
    /// </summary>
    public required int EstimatedSurvivalDays { get; set; }

    /// <summary>
    /// The invoice metadata.
    /// This metadata is used to store system-assigned and user-assigned metadata.
    /// </summary>
    public required InvoiceMetadata Metadata { get; set; }

    /// <summary>
    /// The invoice additional metadata.
    /// This metadata is used to store additional information about the invoice.
    /// Metadata is used to generate the invoice statistics.
    /// </summary>
    public IEnumerable<KeyValuePair<string, object>> AdditionalMetadata { get; set; } = new List<KeyValuePair<string, object>>();


    /// <summary>
    /// Null Object design pattern implementation for the <see cref="Invoice"/> class.
    /// </summary>
    /// <returns></returns>
    [SuppressMessage("Minor Code Smell", "S1075:URIs should not be hardcoded", Justification = "Requirement for Null Object pattern")]
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
            Items = new List<Product>()
            {
                new Product(),
                new Product(),
                new Product(),
                new Product(),
            },
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
