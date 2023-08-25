using System;
using System.Collections.Generic;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

/// <summary>
/// The <see cref="InvoiceMappings"/> class contains methods that create null instances of the entities defined in the `Invoice` domain space.
/// The null instances are used to initialize the entities.
/// These act as default values for the entities. Null object pattern.
/// </summary>
public static class InvoiceMappings
{
    /// <summary>
    /// Null Object pattern for the <see cref="Invoice"/> class.
    /// </summary>
    /// <returns></returns>
    public static Invoice CreateDefaultInvoice()
    {
        return new Invoice
        {
            id = Guid.NewGuid(),
            UserIdentifier = Guid.Empty,
            Currency = "###",
            IsAnalyzed = false,
            IsImportant = false,
            TotalTax = -1,
            TotalAmount = -1,
            Items = new List<InvoiceItem>(),
            UploadedDate = DateTimeOffset.MinValue,
            IdentifiedDate = DateTimeOffset.MinValue,
            ImageUri = new Uri("https://api.arolariu.ro/"),
            Merchant = CreateDefaultInvoiceMerchant(),
            LastAnalyzedDate = DateTimeOffset.MinValue,
            LastModifiedDate = DateTimeOffset.MinValue,
            Description = "Receipt uploaded by a cool user.",
            AdditionalMetadata = new List<KeyValuePair<string, string>>(),
        };
    }

    /// <summary>
    /// Null Object pattern for the <see cref="InvoiceMerchant"/> class.
    /// </summary>
    /// <returns></returns>
    public static InvoiceMerchant CreateDefaultInvoiceMerchant()
    {
        return new InvoiceMerchant
        {
            Name = "Unknown merchant name.",
            Address = "Unknown merchant address.",
            PhoneNumber = "Unkown merchant phone number.",
            ParentCompany = "Unknown merchant parent company.",
            Category = InvoiceMerchantCategory.NOT_DEFINED,
        };
    }

    /// <summary>
    /// Null Object pattern for the <see cref="InvoiceItem"/> class.
    /// </summary>
    /// <returns></returns>
    public static InvoiceItem CreateDefaultInvoiceItem()
    {
        return new InvoiceItem
        {
            Quantity = -1,
            TotalPrice = -1,
            Price = -1,
            RawName = "N/A",
            ProductCode = "###",
            QuantityUnit = "N/A",
            GenericName = "N/A",
            Category = InvoiceItemCategory.NOT_DEFINED,
        };
    }
}
