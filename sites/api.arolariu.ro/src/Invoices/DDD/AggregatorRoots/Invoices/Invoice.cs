using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.Contracts;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;
using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DTOs;

namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[ExcludeFromCodeCoverage] // Entities are not tested - they are used to represent the data in the application domain.
public class Invoice : NamedEntity<Guid>
{
    /// <summary>
    /// The invoice category.
    /// </summary>
    [JsonPropertyOrder(3)]
    public required InvoiceCategory Category { get; set; }

    /// <summary>
    /// The invoice 1:1 user relationship (owner).
    /// </summary>
    [JsonPropertyOrder(4)]
    public required Guid UserIdentifier { get; set; }

    /// <summary>
    /// The invoice photo location.
    /// </summary>
    [JsonPropertyOrder(5)]
    public required Uri PhotoLocation { get; set; }

    /// <summary>
    /// Payment information (currency, total amount, total tax).
    /// </summary>
    [JsonPropertyOrder(6)]
    public required PaymentInformation PaymentInformation { get; set; }

    /// <summary>
    /// The invoice 1:1? merchant relationship.
    /// </summary>
    [JsonPropertyOrder(7)]
    #pragma warning disable CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider declaring as nullable.
    public virtual Merchant Merchant { get; set; }
    #pragma warning restore CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider declaring as nullable.

    /// <summary>
    /// The invoice 1:*? - item relationship.
    /// </summary>
    [JsonPropertyOrder(8)]
    public required IEnumerable<Product> Items { get; set; }

    /// <summary>
    /// Possible recipes for the invoice.
    /// </summary>
    [JsonPropertyOrder(9)]
    public required IEnumerable<Recipe> PossibleRecipes { get; set; }

    /// <summary>
    /// How many days can you survive with the invoice items?
    /// </summary>
    [JsonPropertyOrder(10)]
    public required int EstimatedSurvivalDays { get; set; }

    /// <summary>
    /// The invoice additional metadata.
    /// This metadata is used to store additional information about the invoice.
    /// Metadata is used to generate the invoice statistics.
    /// </summary>
    [JsonPropertyOrder(11)]
    public IEnumerable<KeyValuePair<string, object>> AdditionalMetadata { get; set; } = new List<KeyValuePair<string, object>>();

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
        this.AdditionalMetadata = other.AdditionalMetadata;

        return this;
    }

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
}
