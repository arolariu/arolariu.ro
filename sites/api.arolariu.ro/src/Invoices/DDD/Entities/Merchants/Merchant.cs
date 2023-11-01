using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// The invoice merchant record class represents the merchant information from the invoice.
/// The merchant information is extracted from the invoice image using the OCR service.
/// This record is used to store the merchant information in the database.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class Merchant
{
    /// <summary>
    /// The merchant information.
    /// </summary>
    public MerchantInformation MerchantInformation { get; set; }

    /// <summary>
    /// The merchant category.
    /// </summary>
    public MerchantCategory Category { get; set; } = MerchantCategory.OTHER;

    /// <summary>
    /// The merchant parent company.
    /// The parent company is used to generate the invoice statistics.
    /// </summary>
    public string ParentCompany { get; set; } = string.Empty;
}
