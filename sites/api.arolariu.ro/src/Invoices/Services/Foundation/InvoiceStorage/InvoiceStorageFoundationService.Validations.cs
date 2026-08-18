namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

public partial class InvoiceStorageFoundationService
{
  private const string UnresolvedManualClassificationVersion = "unresolved";

  private static void ValidateIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
  }

  private static void ValidateInvoiceInformationIsValid(Invoice invoice)
  {
    if (invoice?.Items is null)
    {
      return;
    }

    foreach (Product? product in invoice.Items)
    {
      if (product?.RequiresCommercialValidation == true)
      {
        product.ValidateForPersistence();
      }
    }
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
  /// <param name="preserveUntouchedProductClassifications">
  /// Whether an in-place product patch must preserve classifications not supplied by the caller.
  /// </param>
  private void CanonicalizeInvoiceClassifications(
    Invoice invoice,
    bool preserveUntouchedProductClassifications = false)
  {
    if (invoice is null)
    {
      return;
    }

    if (preserveUntouchedProductClassifications is false)
    {
      invoice.Classification = Canonicalize(invoice.Classification, ClassificationSystem.EcoicopV2);
    }

    if (invoice.Items is null)
    {
      return;
    }

    foreach (var product in invoice.Items)
    {
      if (product is not null)
      {
        if (preserveUntouchedProductClassifications is false
          || IsUnresolvedManualSelection(product.Classification))
        {
          product.Classification = Canonicalize(product.Classification, ClassificationSystem.Gs1Gpc);
        }
      }
    }
  }

  private static bool IsUnresolvedManualSelection(StandardClassification? classification) =>
    classification is
    {
      Origin: ClassificationOrigin.Manual,
      Version: UnresolvedManualClassificationVersion,
    };

  private StandardClassification? Canonicalize(StandardClassification? classification, ClassificationSystem expectedSystem)
  {
    if (classification is null)
    {
      return null;
    }

    if (classification.System != expectedSystem)
    {
      RecordTaxonomyValidationFailure(classification.System);
      throw new TaxonomyCodeNotFoundException(
        $"Classification code '{classification.Code}' was supplied for system '{classification.System}' but system '{expectedSystem}' is required here.");
    }

    try
    {
      return taxonomyBroker.Resolve(
        expectedSystem,
        classification.Code,
        classification.Origin,
        classification.Confidence,
        classification.Evidence);
    }
    catch (TaxonomyCodeNotFoundException)
    {
      RecordTaxonomyValidationFailure(expectedSystem);
      throw;
    }
  }

  /// <summary>
  /// Emits the taxonomy validation-failure signals for a rejected classification.
  /// </summary>
  /// <param name="classificationSystem">The taxonomy system whose validation failed.</param>
  /// <remarks>
  /// Only the bounded taxonomy system enum leaves this method. The rejected code is deliberately omitted from both
  /// the metric and the log because it is model- or caller-supplied and therefore unbounded.
  /// </remarks>
  private void RecordTaxonomyValidationFailure(ClassificationSystem classificationSystem)
  {
    InvoiceMetrics.RecordTaxonomyValidationFailure(classificationSystem);
    logger.LogAnalysisTaxonomyValidationFailed(classificationSystem);
  }
}
