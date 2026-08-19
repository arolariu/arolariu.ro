namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

public partial class MerchantStorageFoundationService
{
  private async Task TryCatchAsync(Func<Task> returningTaskFunction)
  {
    try
    {
      await returningTaskFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private async Task<TResult> TryCatchAsync<TResult>(Func<Task<TResult>> returningTaskFunction)
  {
    try
    {
      return await returningTaskFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    MerchantNormalizedNameNotSetException
      => LogAndWrapValidation(exception),

    MerchantIdNotSetException
      or MerchantParentCompanyIdNotSetException
      or TaxonomyCodeNotFoundException
      => LogAndWrapValidation(exception),

    MerchantNotFoundException
      or MerchantAlreadyExistsException
      or MerchantLockedException
      or MerchantCosmosDbRateLimitException
      or MerchantUnauthorizedAccessException
      or MerchantForbiddenAccessException
      => LogAndWrapDependencyValidation(exception),

    MerchantFailedStorageException
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
