namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

public partial class MerchantStorageFoundationService
{
  private void CanonicalizeMerchantClassification(Merchant merchant)
  {
    ClassificationSelection? selection = merchant.PendingClassificationSelection;
    if (selection is null)
    {
      return;
    }

    if (selection.System != ClassificationSystem.Nace21)
    {
      throw new MerchantClassificationNotValidException(
        "Merchant classification must use NACE 2.1.");
    }

    merchant.Classification = taxonomyBroker.Resolve(
      selection.System,
      selection.Code,
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
    merchant.PendingClassificationSelection = null;
  }

  private static void ValidateMerchantIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, MerchantIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, MerchantIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, MerchantIdNotSetException>(identifier, identifier => identifier != default, "Identifier not set!");
  }

  private static void ValidateParentCompanyIdentifierIsSet(Guid? parentCompanyId)
  {
    Validator.ValidateAndThrow<Guid?, MerchantParentCompanyIdNotSetException>(parentCompanyId, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, MerchantParentCompanyIdNotSetException>(parentCompanyId, identifier => identifier != Guid.Empty, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, MerchantParentCompanyIdNotSetException>(parentCompanyId, identifier => identifier != default, "Identifier not set!");
  }
}
