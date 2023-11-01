using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

/// <summary>
/// The invoice storage foundation service interface represents the foundation storage service for the invoice domain.
/// </summary>
public interface IInvoiceStorageFoundationService
{
    /// <summary>
    /// Creates an invoice object.
    /// </summary>
    /// <param name="invoiceDto"></param>
    /// <returns></returns>
    public Task<Invoice> CreateInvoiceObject(CreateInvoiceDto invoiceDto);

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
}
