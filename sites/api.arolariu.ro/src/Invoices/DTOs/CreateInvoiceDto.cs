using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;

using Microsoft.AspNetCore.Http;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// The Invoice DTO class represents the invoice data transfer object.
/// The invoice data transfer object is used to transfer the invoice data from the client to the server.
/// The data is transferred as a JSON object. This object is then deserialized into the Invoice DTO class.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct CreateInvoiceDto(
    [Required] Uri PhotoLocation,
    IEnumerable<KeyValuePair<string, object>> PhotoMetadata)
{
    /// <summary>
    /// Method used to convert the DTO to an invoice.
    /// </summary>
    /// <param name="userIdentifier"></param>
    /// <returns></returns>
    public Invoice ToInvoice(Guid? userIdentifier = null)
    {
        // Given `https://api.arolariu.ro/invoices/58c130ea-f767-4d4e-b1f6-5d514776cb3d.jpg`
        // Retrieve the `58c130ea-f767-4d4e-b1f6-5d514776cb3d` part.
        var invoiceId = this.PhotoLocation.Segments[^1].Split('.')[0];
        var invoice = new Invoice()
        {
            Id = Guid.Parse(invoiceId),
            Category = InvoiceCategory.NOT_DEFINED,
            AdditionalMetadata = this.PhotoMetadata,
            EstimatedSurvivalDays = 0,
            Items = new List<Product>(),
            Merchant = null!, // defer initialization to the OCR service
            PaymentInformation = new PaymentInformation(),
            PhotoLocation = this.PhotoLocation,
            PossibleRecipes = new List<Recipe>(),
            UserIdentifier = userIdentifier ?? Guid.Empty,
            CreatedBy = userIdentifier ?? Guid.Empty,
        };
        return invoice;
    }
}