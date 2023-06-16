using arolariu.Backend.Domain.Invoices.Brokers;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Models;
using arolariu.Backend.Domain.Invoices.Services.InvoiceReader;
using arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Foundation;

/// <summary>
/// The invoice foundation service.
/// </summary>
public class InvoiceFoundationService : IInvoiceFoundationService
{
    /// <inheritdoc/>
    public IInvoiceReaderService InvoiceReaderService { get; }

    /// <inheritdoc/>
    public IInvoiceStorageService InvoiceStorageService { get; }

    /// <inheritdoc/>
    public IInvoiceSqlBroker InvoiceSqlBroker { get; }

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
        InvoiceReaderService = invoiceReaderService ?? throw new ArgumentNullException(nameof(invoiceReaderService));
        InvoiceStorageService = invoiceStorageService ?? throw new ArgumentNullException(nameof(invoiceStorageService));
        InvoiceSqlBroker = invoiceSqlBroker ?? throw new ArgumentNullException(nameof(invoiceSqlBroker));
    }

    /// <inheritdoc/>
    public async Task<Invoice> PublishNewInvoiceObjectIntoTheSystemAsync(PostedInvoiceDto postedInvoiceDto)
    {
        var blobUri = InvoiceStorageService.UploadInvoiceBlobToBlobStorage(postedInvoiceDto);
        var detectedInvoiceAnalysisResult = await InvoiceReaderService.SendInvoiceBlobForAnalysis(blobUri);
        var jsonResult = InvoiceReaderService.ParseInvoiceAnalysisResult(detectedInvoiceAnalysisResult);

        if (jsonResult is not null)
        {
            var boughtItems = jsonResult["Items"]!["BoughtItems"]!.ToObject<Dictionary<string, decimal>>();
            var discountedItems = jsonResult["Items"]!["DiscountedItems"]!.ToObject<Dictionary<string, decimal>>();

            return new Invoice()
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
                    InvoiceSubmittedDate = DateTimeOffset.UtcNow.Date,
                    InvoiceIdentifiedTime = (TimeSpan)jsonResult["TransactionTime"]!,
                    InvoiceSubmittedTime = DateTime.UtcNow.TimeOfDay,
                },
                MerchantInformation = new InvoiceMerchantInformation()
                {
                    MerchantName = (string)jsonResult["MerchantName"]!,
                    MerchantAddress = (string)jsonResult["MerchantAddress"]!,
                    MerchantPhoneNumber = (string)jsonResult["MerchantPhoneNumber"]!,
                },
                AdditionalMetadata = postedInvoiceDto.AdditionalMetadata,
            };
        }
        return Invoice.CreateNullInvoice();
    }

    /// <inheritdoc/>
    public async Task<Invoice> RetrieveExistingInvoiceBasedOnIdentifierAsync(Guid invoiceIdentifier)
    {
        await Task.Delay(1);
        throw new NotImplementedException();
    }
}
