using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using System.Collections.Generic;
using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Services.Orchestration;

/// <summary>
/// The invoice orchestration service interface represents the orchestration service for the invoice domain.
/// </summary>
public interface IInvoiceOrchestrationService
{
    #region Implements the Invoice Analysis Foundation Service
    /// <summary>
    /// Analyze an invoice.
    /// </summary>
    /// <param name="invoiceIdentifier"></param>
    /// <param name="options"></param>
    /// <returns></returns>
    public Task AnalyzeInvoiceWithOptions(Guid invoiceIdentifier, InvoiceAnalysisOptionsDto options);
    #endregion

    #region Implements the Invoice Storage Foundation Service
    /// <summary>
    /// Creates an invoice object.
    /// </summary>
    /// <param name="invoiceDto"></param>
    /// <returns></returns>
    public Task<Invoice> CreateInvoiceObjectFromDto(CreateInvoiceDto invoiceDto);

    /// <summary>
    /// Reads an invoice object.
    /// </summary>
    /// <param name="identifier"></param>
    /// <returns></returns>
    public Task<Invoice> ReadInvoiceObject(Guid identifier);

    /// <summary>
    /// Reads all invoice objects.
    /// </summary>
    /// <returns></returns>
    public Task<IEnumerable<Invoice>> ReadAllInvoiceObjects();

    /// <summary>
    /// Updates an invoice object.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public Task UpdateInvoiceObject(Invoice invoice);

    /// <summary>
    /// Deletes an invoice object.
    /// </summary>
    /// <param name="identifier"></param>
    /// <returns></returns>
    public Task DeleteInvoiceObject(Guid identifier);
    #endregion
}
