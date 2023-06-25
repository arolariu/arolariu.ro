using Microsoft.AspNetCore.Http;

using System;
using System.Text.Json.Serialization;

namespace arolariu.Backend.Domain.Invoices.Models;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[Serializable]
public record class Invoice
{
    /// <summary>
    /// The invoice id.
    /// </summary>
    public required Guid InvoiceId { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The invoice image URI.
    /// </summary>
    public Uri InvoiceImageURI { get; set; } = null!;

    /// <summary>
    /// The invoice image.
    /// </summary>
    [JsonIgnore] // This is not stored in the database and is only used for the initial onboarding of the invoice.
    public IFormFile InvoiceImage { get; set; } = null!;

    /// <summary>
    /// Invoice metadata.
    /// </summary>
    public required InvoiceMetadata InvoiceMetadata { get; set; } = new InvoiceMetadata();

    /// <summary>
    /// The invoice merchant information.
    /// </summary>
    public required InvoiceMerchantInformation MerchantInformation { get; set; } = new InvoiceMerchantInformation();

    /// <summary>
    /// The invoice time information.
    /// </summary>
    public required InvoiceTimeInformation InvoiceTime { get; set; } = new InvoiceTimeInformation();

    /// <summary>
    /// The invoice transaction information.
    /// </summary>
    public required InvoiceTransactionInformation TransactionInformation { get; set; } = new InvoiceTransactionInformation();

    /// <summary>
    /// The invoice items.
    /// </summary>
    public required InvoiceItemsInformation Items { get; set; } = new InvoiceItemsInformation();

    /// <summary>
    /// Null object pattern for the invoice model.
    /// </summary>
    /// <returns></returns>
    internal static Invoice CreateNullInvoice()
    {
        return new Invoice()
        {
            InvoiceId = Guid.Empty,
            InvoiceImageURI = null!,
            InvoiceMetadata = InvoiceMetadata.CreateNullInvoiceMetadata(),
            TransactionInformation = InvoiceTransactionInformation.CreateNullInvoiceTransactionInformation(),
            MerchantInformation = InvoiceMerchantInformation.CreateNullInvoiceMerchantInformation(),
            InvoiceTime = InvoiceTimeInformation.CreateNullInvoiceTimeInformation(),
            Items = InvoiceItemsInformation.CreateNullInvoiceItemsInformation()
        };
    }

    internal static bool VerifyInvoiceIsComplete(Invoice invoice)
    {
        return
                invoice.InvoiceId != Guid.Empty &&
                invoice.InvoiceImageURI != null &&
                !InvoiceTimeInformation.CheckInvoiceTimeInformationStructIsNull(invoice.InvoiceTime) &&
                !InvoiceMerchantInformation.CheckInvoiceMerchantInformationStructIsNull(invoice.MerchantInformation) &&
                !InvoiceTransactionInformation.CheckInvoiceTransactionInformationStructIsNull(invoice.TransactionInformation) &&
                !InvoiceItemsInformation.CheckInvoiceItemsInformationStructIsNull(invoice.Items);
    }
}
