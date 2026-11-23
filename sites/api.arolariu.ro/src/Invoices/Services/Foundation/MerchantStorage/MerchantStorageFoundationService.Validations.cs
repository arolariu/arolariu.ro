namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

public partial class MerchantStorageFoundationService
{
  private static void ValidateCategory(MerchantCategory? category)
  {
    if (category is { } id && !Enum.IsDefined(id))
    {
      throw new ArgumentOutOfRangeException(nameof(category), "The category is not defined for merchants.");
    }
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
}
