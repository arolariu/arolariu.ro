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

    // Pass through broker exceptions that already implement correct HTTP classification markers
    // (INotFoundException → 404, IAlreadyExistsException → 409, ILockedException → 423, etc.)
    // Wrapping these in DependencyValidation would mask their intended HTTP status codes.
    MerchantNotFoundException
      or MerchantAlreadyExistsException
      or MerchantLockedException
      or MerchantCosmosDbRateLimitException
      or MerchantUnauthorizedAccessException
      or MerchantForbiddenAccessException
      => LogAndPassThrough(exception),

    MerchantFailedStorageException
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

  private Exception LogAndPassThrough(Exception exception)
  {
    // Log at Foundation layer for observability, but preserve the original exception
    // with its classification marker interface (INotFoundException, ILockedException, etc.)
    // so ExceptionToHttpResultMapper can produce the correct HTTP status code.
    logger.LogMerchantStorageServiceDependencyValidationException(exception.Message);
    return exception;
  }

  private MerchantFoundationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new MerchantFoundationServiceException(exception);
    logger.LogMerchantStorageServiceException(outer.Message);
    return outer;
  }
}
