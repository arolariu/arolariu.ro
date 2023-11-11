using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DTOs;

using System;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

public partial class InvoiceStorageFoundationService
{
    private static void ValidateIdentifierIsSet(Guid? identifier)
    {
        Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
        Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
        Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != default, "Identifier not set!");
    }

    private static void ValidateInvoiceInformationIsCorrect(Invoice? invoice)
    {
        Validator.ValidateAndThrow<Invoice?, InvoiceDescriptionNotSetException>(invoice, invoice => string.IsNullOrEmpty(invoice?.Description), "Invoice description not set!");

        // TODO: complete all other cases.
    }

    private static void ValidateDtoIsValid(CreateInvoiceDto? invoiceDto)
    {
        // TO complete.
    }
}
