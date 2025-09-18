namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

public partial class MerchantStorageFoundationService
{
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
