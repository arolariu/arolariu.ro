namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;

using Microsoft.EntityFrameworkCore;

public partial class MerchantStorageFoundationService
{
  private delegate Task CallbackFunctionWithNoReturn();

  private delegate Task<Merchant> CallbackFunctionForMerchant();

  private delegate Task<IEnumerable<Merchant>> CallbackFunctionForMerchantList();

  private async Task TryCatchAsync(CallbackFunctionWithNoReturn callbackFunction)
  {
    try
    {
      await callbackFunction().ConfigureAwait(false);
    }
    catch (MerchantIdNotSetException exception)
    {
      throw CreateAndLogValidationException(exception);
    }
    catch (MerchantParentCompanyIdNotSetException exception)
    {
      throw CreateAndLogValidationException(exception);
    }
    catch (DbUpdateConcurrencyException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (DbUpdateException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (OperationCanceledException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<Merchant> TryCatchAsync(CallbackFunctionForMerchant callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (DbUpdateConcurrencyException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (DbUpdateException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (OperationCanceledException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<IEnumerable<Merchant>> TryCatchAsync(CallbackFunctionForMerchantList callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (DbUpdateConcurrencyException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (DbUpdateException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (OperationCanceledException exception)
    {
      throw CreateAndLogDependencyException(exception);
    }
    catch (ArgumentNullException exception)
    {
      throw CreateAndLogDependencyValidationException(exception);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private MerchantFoundationServiceValidationException CreateAndLogValidationException(Exception exception)
  {
    var merchantOrchestrationServiceValidationException = new MerchantFoundationServiceValidationException(exception);
    var exceptionMessage = merchantOrchestrationServiceValidationException.Message;
    logger.LogMerchantStorageServiceValidationException(exceptionMessage);
    return merchantOrchestrationServiceValidationException;
  }

  private MerchantFoundationServiceDependencyException CreateAndLogDependencyException(Exception exception)
  {
    var merchantOrchestrationServiceDependencyException = new MerchantFoundationServiceDependencyException(exception);
    var exceptionMessage = merchantOrchestrationServiceDependencyException.Message;
    logger.LogMerchantStorageServiceDependencyException(exceptionMessage);
    return merchantOrchestrationServiceDependencyException;
  }

  private MerchantFoundationServiceDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
  {
    var merchantOrchestrationServiceDependencyValidationException = new MerchantFoundationServiceDependencyValidationException(exception);
    var exceptionMessage = merchantOrchestrationServiceDependencyValidationException.Message;
    logger.LogMerchantStorageServiceDependencyValidationException(exceptionMessage);
    return merchantOrchestrationServiceDependencyValidationException;
  }

  private MerchantFoundationServiceException CreateAndLogServiceException(Exception exception)
  {
    var merchantOrchestrationServiceException = new MerchantFoundationServiceException(exception);
    var exceptionMessage = merchantOrchestrationServiceException.Message;
    logger.LogMerchantStorageServiceException(exceptionMessage);
    return merchantOrchestrationServiceException;
  }
}
