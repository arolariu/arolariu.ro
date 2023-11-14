﻿using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

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
    public Task AnalyzeInvoiceAsync(Invoice invoice, AnalysisOptionsDto options);
}
