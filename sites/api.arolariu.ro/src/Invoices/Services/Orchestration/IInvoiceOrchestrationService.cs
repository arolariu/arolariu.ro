using System.Collections.Generic;
using System;
using System.Threading.Tasks;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

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
    /// Creates an invoice object.
    /// </summary>
    /// <param name="createInvoiceDto"></param>
    /// <returns></returns>
    public Task<Invoice> CreateInvoiceObject(CreateInvoiceDto createInvoiceDto);

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
    /// <param name="currentInvoice"></param>
    /// <param name="updatedInvoice"></param>
    /// <returns></returns>
    public Task<Invoice> UpdateInvoiceObject(Invoice currentInvoice, Invoice updatedInvoice);

    /// <summary>
    /// Deletes an invoice object.
    /// </summary>
    /// <param name="identifier"></param>
    /// <returns></returns>
    public Task DeleteInvoiceObject(Guid identifier);
    #endregion
}
