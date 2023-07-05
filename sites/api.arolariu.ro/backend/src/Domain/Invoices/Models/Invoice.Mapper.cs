using arolariu.Backend.Core.Domain.Invoices.DTOs;

using Microsoft.AspNetCore.Http;

using Newtonsoft.Json;

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace arolariu.Backend.Core.Domain.Invoices.Models;

/// <summary>
/// Invoice mapper static helper class.
/// </summary>
public static class InvoiceMapper
{
    /// <summary>
    /// Maps a given <see cref="PostedInvoiceDto"/> object to an invoice object.
    /// </summary>
    /// <param name="postedInvoiceDto"></param>
    /// <returns></returns>
    public static Invoice MapPostedInvoiceDtoToActualInvoice(PostedInvoiceDto postedInvoiceDto)
    {
        return new Invoice()
        {
            InvoiceId = Guid.NewGuid(),
            InvoiceImageURI = null!,
            InvoiceImage = ConvertToFormFile(postedInvoiceDto),
            InvoiceMetadata = new InvoiceMetadata() { MetadataBag = postedInvoiceDto.AdditionalMetadata },
            InvoiceTime = InvoiceTimeInformation.CreateNullInvoiceTimeInformation(),
            MerchantInformation = InvoiceMerchantInformation.CreateNullInvoiceMerchantInformation(),
            TransactionInformation = InvoiceTransactionInformation.CreateNullInvoiceTransactionInformation(),
            Items = InvoiceItemsInformation.CreateNullInvoiceItemsInformation(),
        };
    }

    /// <summary>
    /// To complete
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public static Invoice MapDbInvoiceToDomainInvoice(DatabaseInvoice invoice)
    {
        // Extract the metadata bag from the database invoice retrieved response.
        // Since we're using Dapper, we need to manually deserialize the JSON string into a dictionary and perform the 'hard-work'.
        var metadataKVList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(invoice.MetadataBag);
        var metadataBag = metadataKVList?.ToDictionary(
            keyValue => (string)keyValue["Key"],
            keyValue => keyValue["Value"])
                ?? new Dictionary<string, object>();

        var boughtItems = JsonConvert.DeserializeObject<Dictionary<string, decimal>>(invoice.BoughtItems);
        var discountedItems = JsonConvert.DeserializeObject<Dictionary<string, decimal>>(invoice.DiscountedItems);

        return new Invoice()
        {
            InvoiceId = invoice.Id,
            InvoiceImageURI = new Uri(invoice.ImageURI),
            InvoiceMetadata = new InvoiceMetadata() { MetadataBag = metadataBag },
            InvoiceTime = new InvoiceTimeInformation()
            {
                InvoiceSubmittedDate = invoice.InvoiceSubmittedDate,
                InvoiceIdentifiedDate = invoice.InvoiceIdentifiedDate,
            },
            Items = new InvoiceItemsInformation
            {
                BoughtItems = boughtItems!,
                DiscountedItems = discountedItems!,
            },
            MerchantInformation = new InvoiceMerchantInformation()
            {
                MerchantAddress = invoice.MerchantAddress,
                MerchantName = invoice.MerchantName,
                MerchantPhoneNumber = invoice.MerchantPhoneNumber,
            },
            TransactionInformation = new InvoiceTransactionInformation()
            {
                TransactionCalories = -1,
                TransactionDescription = "Simple invoice made by a cool user.",
                TransactionTotal = (decimal)invoice.InvoiceTransactionTotal,
            },
        };
    }

    /// <summary>
    /// Converts a <see cref="PostedInvoiceDto"/> Base64 photo object to a <see cref="IFormFile"/> object.
    /// </summary>
    /// <param name="postedInvoiceDto">The <see cref="PostedInvoiceDto"/> object containing the invoice data.</param>
    /// <returns>The converted <see cref="IFormFile"/> object.</returns>
    private static IFormFile ConvertToFormFile(PostedInvoiceDto postedInvoiceDto)
    {
        var splittedBase64String = postedInvoiceDto.InvoiceBase64Photo.Split(";base64,");
        var base64String = splittedBase64String[1];
        var contentType = splittedBase64String[0].Split(":")[1];
        var splittedContentType = contentType.Split("/");
        var fileType = splittedContentType[0];
        var fileExtension = splittedContentType[1];
        var array = Convert.FromBase64String(base64String);
        var stream = new MemoryStream(array) { Position = 0 };
        return new FormFile(stream, 0, stream.Length, fileType, $"InvoiceImage.{fileExtension}")
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType,
        };
    }

}
