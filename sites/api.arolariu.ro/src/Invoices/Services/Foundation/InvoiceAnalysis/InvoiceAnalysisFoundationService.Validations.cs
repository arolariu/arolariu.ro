using arolariu.Backend.Domain.Invoices.Entities.Invoices;

using System;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

public partial class InvoiceAnalysisFoundationService
{
    private static void ValidateInvoiceExists(Invoice invoice)
    {
        ArgumentNullException.ThrowIfNull(invoice);
    }

    private static void ValidateInvoiceFieldsArePopulated(Invoice invoice)
    {
        ValidateInvoiceExists(invoice);
        ArgumentNullException.ThrowIfNull(invoice.AdditionalMetadata);
        ArgumentNullException.ThrowIfNull(invoice.Description);
        ArgumentNullException.ThrowIfNull(invoice.Items);
        ArgumentNullException.ThrowIfNull(invoice.DateOfPurchase);
        ArgumentNullException.ThrowIfNull(invoice.ImageLocation);
    }
}
