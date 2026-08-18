namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

public partial class MerchantStorageFoundationService
{
  private static string NormalizeAndValidateNormalizedName(string normalizedName)
  {
    string normalizedMerchantName = MerchantNameNormalizer.Normalize(normalizedName);

    if (string.IsNullOrEmpty(normalizedMerchantName))
    {
      throw new MerchantNormalizedNameNotSetException(
        new ArgumentException(
          "Merchant normalized name must resolve to a non-empty value.",
          nameof(normalizedName)));
    }

    return normalizedMerchantName;
  }

  private static void ValidateMerchantIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, MerchantIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, MerchantIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
  }

  private static void ValidateParentCompanyIdentifierIsSet(Guid? parentCompanyId)
  {
    Validator.ValidateAndThrow<Guid?, MerchantParentCompanyIdNotSetException>(parentCompanyId, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, MerchantParentCompanyIdNotSetException>(parentCompanyId, identifier => identifier != Guid.Empty, "Identifier not set!");
  }

  /// <summary>
  /// Rewrites the merchant classification into its canonical NACE taxonomy projection.
  /// </summary>
  /// <remarks>
  /// <para>Callers - including the manual picker DTO - may only assert a taxonomy system and a code. The authoritative
  /// version, official label, and hierarchy always come from the generated taxonomy artifacts, so the entity is
  /// re-projected here immediately before it reaches the persistence broker.</para>
  /// </remarks>
  /// <param name="merchant">The entity about to be persisted.</param>
  private void CanonicalizeMerchantClassification(Merchant merchant)
  {
    if (merchant is null)
    {
      return;
    }

    merchant.Classification = Canonicalize(merchant.Classification, ClassificationSystem.Nace21);
  }

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
