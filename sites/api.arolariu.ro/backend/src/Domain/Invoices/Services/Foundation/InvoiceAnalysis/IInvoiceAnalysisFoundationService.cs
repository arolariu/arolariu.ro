using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public interface IInvoiceAnalysisFoundationService
{
    /// <summary>
    /// Analyze an invoice.
    /// </summary>
    /// <param name="invoice"></param>
    /// <param name="options"></param>
    /// <returns></returns>
    public Task<Invoice> AnalyzeInvoiceWithOptions(Invoice invoice, InvoiceAnalysisOptionsDto options);
}
