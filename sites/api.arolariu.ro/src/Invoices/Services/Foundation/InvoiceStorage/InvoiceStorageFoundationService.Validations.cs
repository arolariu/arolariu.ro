namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions.Inner;

public partial class InvoiceStorageFoundationService
{
  private void CanonicalizeInvoiceClassification(Invoice invoice)
  {
    ClassificationSelection? selection = invoice.PendingClassificationSelection;
    if (selection is null)
    {
      return;
    }

    if (selection.System != ClassificationSystem.EcoicopV2)
    {
      throw new InvoiceClassificationNotValidException(
        "Invoice classification must use ECOICOP v2.");
    }

    invoice.Classification = taxonomyBroker.Resolve(
      selection.System,
      selection.Code,
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
    invoice.PendingClassificationSelection = null;
  }

  private void CanonicalizeProductClassifications(Invoice invoice)
  {
    foreach (Product product in invoice.Items)
    {
      ClassificationSelection? selection = product.PendingClassificationSelection;
      if (selection is null)
      {
        continue;
      }

      if (selection.System != ClassificationSystem.Gs1Gpc)
      {
        throw new ProductClassificationNotValidException(
          "Product classification must use GS1 GPC.");
      }

      product.Classification = taxonomyBroker.Resolve(
        selection.System,
        selection.Code,
        ClassificationOrigin.Manual,
        confidence: null,
        evidence: []);
      product.PendingClassificationSelection = null;
    }
  }

  private static void ValidateIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != default, "Identifier not set!");
  }

  private static void ValidateInvoiceInformationIsValid(Invoice invoice)
  {
    // TODO: complete in the future, if needed.
  }
}
