using arolariu.Backend.Common.DDD.Contracts;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// The invoice merchant record class represents the merchant information from the invoice.
/// The merchant information is extracted from the invoice image using the OCR service.
/// This record is used to store the merchant information in the database.
/// </summary>
[ExcludeFromCodeCoverage]
public class Merchant : NamedEntity<Guid>
{
    /// <summary>
    /// The merchant parent company.
    /// The parent company is used to generate the invoice statistics.
    /// </summary>
    [JsonPropertyOrder(3)]
    public Guid ParentCompanyId { get; set; }

    /// <summary>
    /// The merchant address.
    /// </summary>
    [JsonPropertyOrder(4)]
    public string Address { get; set; } = string.Empty;

    /// <summary>
    /// The merchant phone number.
    /// </summary>
    [JsonPropertyOrder(5)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// The merchant category.
    /// </summary>
    [JsonPropertyOrder(6)]
    public MerchantCategory Category { get; set; } = MerchantCategory.OTHER;
}