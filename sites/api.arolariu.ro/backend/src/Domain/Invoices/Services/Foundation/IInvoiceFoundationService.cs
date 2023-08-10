using arolariu.Backend.Core.Domain.Invoices.Brokers;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoicePhotoStorageBroker;
using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Services.Foundation;

/// <summary>
/// The invoice foundation service interface represents the base service for the invoice domain.
/// </summary>
public interface IInvoiceFoundationService
{
    /// <summary>
    /// Converts the invoice DTO to an invoice entity.
    /// This method is used to convert the invoice DTO received from the API to an invoice entity that can be stored in the NoSQL database.
    /// </summary>
    /// <param name="invoiceDto"></param>
    /// <returns></returns>
    public Task<Invoice> ConvertDtoToEntity(CreateInvoiceDto invoiceDto);

    /// <summary>
    /// Creates an invoice object.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public Task<Invoice> CreateInvoiceObject(Invoice invoice);

    /// <summary>
    /// Analyze an invoice object.
    /// </summary>
    /// <param name="identifier"></param>
    /// <returns></returns>
    public Task<Invoice> AnalyzeInvoiceObject(Guid identifier);

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
}
