namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;

public partial class MerchantStorageFoundationService
{
  private delegate Task ReturningTaskFunction();
  private delegate Task<Merchant> ReturningMerchantFunction();
  private delegate Task<IEnumerable<Merchant>> ReturningMerchantsFunction();

  private async Task TryCatchAsync(ReturningTaskFunction returningTaskFunction)
  {
    try
    {
      await returningTaskFunction().ConfigureAwait(false);
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private async Task<Merchant> TryCatchAsync(ReturningMerchantFunction returningMerchantFunction)
  {
    try
    {
      return await returningMerchantFunction().ConfigureAwait(false);
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private async Task<IEnumerable<Merchant>> TryCatchAsync(ReturningMerchantsFunction returningMerchantsFunction)
  {
    try
    {
      return await returningMerchantsFunction().ConfigureAwait(false);
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    MerchantIdNotSetException
      or MerchantParentCompanyIdNotSetException
      => LogAndWrapValidation(exception),

    MerchantNotFoundException
      or MerchantAlreadyExistsException
      or MerchantLockedException
      => LogAndWrapDependencyValidation(exception),

    MerchantCosmosDbRateLimitException
      or MerchantFailedStorageException
      or MerchantUnauthorizedAccessException
      or MerchantForbiddenAccessException
      or OperationCanceledException
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private MerchantFoundationServiceValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new MerchantFoundationServiceValidationException(exception);
    logger.LogMerchantStorageServiceValidationException(outer.Message);
    return outer;
  }

  private MerchantFoundationServiceDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new MerchantFoundationServiceDependencyException(exception);
    logger.LogMerchantStorageServiceDependencyException(outer.Message);
    return outer;
  }

  private MerchantFoundationServiceDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new MerchantFoundationServiceDependencyValidationException(exception);
    logger.LogMerchantStorageServiceDependencyValidationException(outer.Message);
    return outer;
  }

  private MerchantFoundationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new MerchantFoundationServiceException(exception);
    logger.LogMerchantStorageServiceException(outer.Message);
    return outer;
  }
}
