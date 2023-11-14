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

    private static void ValidateInvoiceHasProducts(Invoice invoice)
    {
        ArgumentNullException.ThrowIfNull(invoice.Items);
        if (invoice.Items.ToList().Count == 0)
        {
            throw new ArgumentException("The invoice has no products.");
        }
    }

    private static void ValidateProductExists(Product product)
    {
        ArgumentNullException.ThrowIfNull(product);
    }

    private static void ValidateProductNameExists(Product product)
    {
        ArgumentNullException.ThrowIfNull(product.RawName);
        ArgumentNullException.ThrowIfNull(product.GenericName);
    }
    private static void ValidateAnalysisOptionsAreSet(AnalysisOptionsDto options)
    {
        ArgumentNullException.ThrowIfNull(options);
    }
}
