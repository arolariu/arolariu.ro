using arolariu.Backend.Domain.Invoices.Brokers;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Models;
using arolariu.Backend.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json.Linq;
using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Foundation
{
    /// <summary>
    /// The invoice foundation service.
    /// </summary>
    public interface IInvoiceFoundationService
    {
        /// <summary>
        /// The injected invoice reader service.
        /// </summary>
        protected IInvoiceReaderService invoiceReaderService { get; }

        /// <summary>
        /// The injected invoice storage service.
        /// </summary>
        protected IInvoiceStorageService invoiceStorageService { get; }

        /// <summary>
        /// The injected invoice SQL broker.
        /// </summary>
        protected IInvoiceSqlBroker invoiceSqlBroker { get; }

        /// <summary>
        /// The invoice foundation service method for processing new invoices into the system.
        /// </summary>
        /// <returns></returns>
        public Task<Invoice> PublishNewInvoiceObjectIntoTheSystem(PostedInvoiceDto postedInvoiceDto);

        /// <summary>
        /// The invoice foundation service method for retrieving existing invoices from the system.
        /// </summary>
        /// <param name="invoiceIdentifier"></param>
        /// <returns></returns>
        public Task<Invoice> RetrieveExistingInvoiceBasedOnIdentifier(Guid invoiceIdentifier);
    }
}
