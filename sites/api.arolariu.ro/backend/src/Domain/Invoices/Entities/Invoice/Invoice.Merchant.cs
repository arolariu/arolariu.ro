using System;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

/// <summary>
/// The invoice merchant record class represents the merchant information from the invoice.
/// The merchant information is extracted from the invoice image using the OCR service.
/// This record is used to store the merchant information in the database.
/// </summary>
[Serializable]
public record class InvoiceMerchant
{
    /// <summary>
    /// The merchant name.
    /// </summary>
    public required string Name { get; set; } = string.Empty;

    /// <summary>
    /// The merchant address.
    /// </summary>
    public required string Address { get; set; } = string.Empty;

    /// <summary>
    /// The merchant phone number.
    /// </summary>
    public required string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// The merchant category.
    /// </summary>
    public InvoiceMerchantCategory Category { get; set; } = InvoiceMerchantCategory.OTHER;

    /// <summary>
    /// The merchant parent company.
    /// For example, the parent company for Carrefour Romania is Carrefour.
    /// The parent company is used to generate the invoice statistics.
    /// </summary>
    public string ParentCompany { get; set; } = string.Empty;
}
