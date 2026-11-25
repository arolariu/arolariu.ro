namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

public partial class InvoiceStorageFoundationService
{
  private static void ValidateIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != default, "Identifier not set!");
  }

  private static void ValidateInvoiceInformationIsValid(Invoice invoice)
  {
    Validator.ValidateAndThrow<Invoice, InvoiceNotFoundException>(
      invoice,
      static candidate => candidate is not null,
      "Invoice not found!");

    ValidateIdentifierIsSet(invoice.id);
    ValidateIdentifierIsSet(invoice.UserIdentifier);
    ValidateScansAreSet(invoice.Scans);
    ValidateCategory(invoice.Category);
    foreach (Product product in invoice.Items ?? [])
    {
      ValidateCategory(product.Category);
    }
  }

  private static void ValidateCategory<TCategory>(TCategory? category) where TCategory : struct, Enum
  {
    if (category is { } id && !Enum.IsDefined(id))
    {
      throw new ArgumentOutOfRangeException(nameof(category), "The category is not defined for this domain.");
    }
  }

  private static void ValidateScansAreSet(IEnumerable<InvoiceScan>? scans)
  {
    Validator.ValidateAndThrow<IEnumerable<InvoiceScan>?, InvoicePhotoLocationNotCorrectException>(
      scans,
      static candidate => candidate is not null,
      "Invoice must contain at least one scan.");
  }

}
