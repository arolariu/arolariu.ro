using arolariu.Backend.Domain.Invoices.Brokers;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Models;
using arolariu.Backend.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Foundation
{
    /// <summary>
    /// The invoice foundation service.
    /// </summary>
    public class InvoiceFoundationService : IInvoiceFoundationService
    {
        /// <inheritdoc/>
        public IInvoiceReaderService invoiceReaderService { get; }

        /// <inheritdoc/>
        public IInvoiceStorageService invoiceStorageService { get; }

        /// <inheritdoc/>
        public IInvoiceSqlBroker invoiceSqlBroker { get; }

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="invoiceReaderService"></param>
        /// <param name="invoiceStorageService"></param>
        /// <param name="invoiceSqlBroker"></param>
        public InvoiceFoundationService(
            IInvoiceReaderService invoiceReaderService,
            IInvoiceStorageService invoiceStorageService,
            IInvoiceSqlBroker invoiceSqlBroker)
        {
            this.invoiceReaderService = invoiceReaderService;
            this.invoiceStorageService = invoiceStorageService;
            this.invoiceSqlBroker = invoiceSqlBroker;
        }

        /// <inheritdoc/>
        public async Task<Invoice> PublishNewInvoiceObjectIntoTheSystem(PostedInvoiceDto postedInvoiceDto)
        {
            var blobUri = invoiceStorageService.UploadInvoiceBlobToBlobStorage(postedInvoiceDto);
            var detectedInvoiceAnalysisResult = await invoiceReaderService.SendInvoiceBlobForAnalysis(blobUri);
            var jsonResult = invoiceReaderService.ParseInvoiceAnalysisResult(detectedInvoiceAnalysisResult);

            if (jsonResult is not null)
            {
                var boughtItems = jsonResult["Items"]!["BoughtItems"]!.ToObject<Dictionary<string, decimal>>();
                var discountedItems = jsonResult["Items"]!["DiscountedItems"]!.ToObject<Dictionary<string, decimal>>();
                Invoice invoice = new Invoice()
                {
                    InvoiceId = postedInvoiceDto.InvoiceId,
                    InvoiceImageBlobUri = blobUri,
                    InvoiceItems = new InvoiceItemsInformation()
                    {
                        BoughtItems = boughtItems!,
                        DiscountedItems = discountedItems!,
                    },
                    TransactionInformation = new InvoiceTransactionInformation()
                    {
                        TransactionDate = (DateTimeOffset)jsonResult["TransactionDate"]!,
                        TransactionTime = (DateTimeOffset)jsonResult["TransactionTime"]!,
                        TransactionTotal = (decimal)jsonResult["TransactionTotal"]!,
                    },
                    InvoiceTime = new InvoiceTimeInformation()
                    {
                        InvoiceIdentifiedDate = (DateTime)jsonResult["TransactionDate"]!,
                        InvoiceIdentifiedTime = (TimeSpan)jsonResult["TransactionTime"]!,
                        InvoiceSubmittedDate = DateTimeOffset.UtcNow.Date,
                        InvoiceSubmittedTime = DateTimeOffset.UtcNow.TimeOfDay,
                    },
                    MerchantInformation = new InvoiceMerchantInformation()
                    {
                        MerchantName = (string)jsonResult["MerchantName"]!,
                        MerchantAddress = (string)jsonResult["MerchantAddress"]!,
                        MerchantPhoneNumber = (string)jsonResult["MerchantPhoneNumber"]!,
                    }
                };

                return invoice;
            }
            return Invoice.CreateNullInvoice();
        }

        /// <inheritdoc/>
        public async Task<Invoice> RetrieveExistingInvoiceBasedOnIdentifier(Guid invoiceIdentifier)
        {
            await Task.Delay(1);
            throw new NotImplementedException();
        }
    }
}
