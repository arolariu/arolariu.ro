namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

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
    // TODO: complete in the future, if needed.
  }

  /// <summary>
  /// Rewrites every non-null classification carried by the aggregate into its canonical taxonomy projection.
  /// </summary>
  /// <remarks>
  /// <para>Callers - including the manual picker DTO - may only assert a taxonomy system and a code. The authoritative
  /// version, official label, and hierarchy always come from the generated taxonomy artifacts, so the aggregate is
  /// re-projected here immediately before it reaches the persistence broker.</para>
  /// </remarks>
  /// <param name="invoice">The aggregate about to be persisted.</param>
  private void CanonicalizeInvoiceClassifications(Invoice invoice)
  {
    if (invoice is null)
    {
      return;
    }

    invoice.Classification = Canonicalize(invoice.Classification, ClassificationSystem.EcoicopV2);

    if (invoice.Items is null)
    {
      return;
    }

    foreach (var product in invoice.Items)
    {
      if (product is not null)
      {
        product.Classification = Canonicalize(product.Classification, ClassificationSystem.Gs1Gpc);
      }
    }
  }

  private StandardClassification? Canonicalize(StandardClassification? classification, ClassificationSystem expectedSystem)
  {
    if (classification is null)
    {
      return null;
    }

    if (classification.System != expectedSystem)
    {
      throw new TaxonomyCodeNotFoundException(
        $"Classification code '{classification.Code}' was supplied for system '{classification.System}' but system '{expectedSystem}' is required here.");
    }

    return taxonomyBroker.Resolve(
      expectedSystem,
      classification.Code,
      classification.Origin,
      classification.Confidence,
      classification.Evidence);
  }
}
