using System;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Merchants;

/// <summary>
/// The invoice merchant record class represents the merchant information from the invoice.
/// The merchant information is extracted from the invoice image using the OCR service.
/// This record is used to store the merchant information in the database.
/// </summary>
[Serializable]
public record class Merchant
{
    /// <summary>
    /// The merchant name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The merchant address.
    /// </summary>
    public string Address { get; set; } = string.Empty;

    /// <summary>
    /// The merchant phone number.
    /// </summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// The merchant category.
    /// </summary>
    public MerchantCategory Category { get; set; } = MerchantCategory.OTHER;

    /// <summary>
    /// The merchant parent company.
    /// For example, the parent company for Carrefour Romania is Carrefour.
    /// The parent company is used to generate the invoice statistics.
    /// </summary>
    public string ParentCompany { get; set; } = string.Empty;
}
