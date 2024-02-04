using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;
using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DTOs;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

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
    [DeleteBehavior(DeleteBehavior.ClientNoAction)]
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
    public IEnumerable<Recipe> PossibleRecipes { get; } = new List<Recipe>();

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
    public IEnumerable<KeyValuePair<string, object>> AdditionalMetadata { get; } = new List<KeyValuePair<string, object>>();

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
