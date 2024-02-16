using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Linq;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

public partial class InvoiceAnalysisFoundationService
{
    private static void ValidateInvoiceExists(Invoice invoice)
    {
        ArgumentNullException.ThrowIfNull(invoice);
    }

    private static void ValidateAnalysisOptionsAreSet(AnalysisOptionsDto options)
    {
        ArgumentNullException.ThrowIfNull(options);
    }
}
