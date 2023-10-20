using arolariu.Backend.Domain.Invoices.DTOs;

using System;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

public partial class InvoiceStorageFoundationService
{
    private static void ValidateInvoiceDto(CreateInvoiceDto invoiceDto)
    {
        ArgumentNullException.ThrowIfNull(invoiceDto);
        ArgumentNullException.ThrowIfNull(invoiceDto.InvoiceBase64Photo);
    }
}
