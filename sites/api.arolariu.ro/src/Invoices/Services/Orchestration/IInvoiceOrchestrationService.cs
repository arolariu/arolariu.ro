using System.Collections.Generic;
using System;
using System.Threading.Tasks;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Entities.Invoices;

namespace arolariu.Backend.Domain.Invoices.Services.Orchestration;

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
    public Task AnalyzeInvoiceWithOptions(Guid invoiceIdentifier, AnalysisOptionsDto options);
    #endregion

    #region Implements the Invoice Storage Foundation Service
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
    public Task<Invoice> UpdateInvoiceObject(Invoice invoice);

    /// <summary>
    /// Deletes an invoice object.
    /// </summary>
    /// <param name="identifier"></param>
    /// <returns></returns>
    public Task<Invoice> DeleteInvoiceObject(Guid identifier);
    #endregion
}
