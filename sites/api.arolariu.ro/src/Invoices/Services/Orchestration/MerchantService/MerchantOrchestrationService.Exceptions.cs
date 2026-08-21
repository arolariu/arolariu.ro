namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

public partial class MerchantOrchestrationService
{
  private async Task TryCatchAsync(Func<Task> callbackFunction)
  {
    try
    {
      await callbackFunction().ConfigureAwait(false);
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

  private async Task<TResult> TryCatchAsync<TResult>(Func<Task<TResult>> callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
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
    MerchantFoundationServiceValidationException => CreateAndLogValidationException(exception.InnerException ?? exception),
    MerchantFoundationServiceDependencyValidationException => CreateAndLogDependencyValidationException(exception.InnerException ?? exception),
    MerchantFoundationServiceDependencyException => CreateAndLogDependencyException(exception.InnerException ?? exception),
    MerchantFoundationServiceException => CreateAndLogServiceException(exception.InnerException ?? exception),
    _ => CreateAndLogServiceException(exception),
  };

  private MerchantOrchestrationServiceValidationException CreateAndLogValidationException(Exception exception)
  {
    var merchantOrchestrationServiceValidationException = new MerchantOrchestrationServiceValidationException(exception);
    var exceptionMessage = merchantOrchestrationServiceValidationException.Message;
    logger.LogMerchantOrchestrationValidationException(exceptionMessage);
    return merchantOrchestrationServiceValidationException;
  }

  private MerchantOrchestrationServiceDependencyException CreateAndLogDependencyException(Exception exception)
  {
    var merchantOrchestrationServiceDependencyException = new MerchantOrchestrationServiceDependencyException(exception);
    var exceptionMessage = merchantOrchestrationServiceDependencyException.Message;
    logger.LogMerchantOrchestrationDependencyException(exceptionMessage);
    return merchantOrchestrationServiceDependencyException;
  }

  private MerchantOrchestrationServiceDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
  {
    var merchantOrchestrationServiceDependencyValidationException = new MerchantOrchestrationServiceDependencyValidationException(exception);
    var exceptionMessage = merchantOrchestrationServiceDependencyValidationException.Message;
    logger.LogMerchantOrchestrationDependencyValidationException(exceptionMessage);
    return merchantOrchestrationServiceDependencyValidationException;
  }

  private MerchantOrchestrationServiceException CreateAndLogServiceException(Exception exception)
  {
    var merchantOrchestrationServiceException = new MerchantOrchestrationServiceException(exception);
    var exceptionMessage = merchantOrchestrationServiceException.Message;
    logger.LogMerchantOrchestrationServiceException(exceptionMessage);
    return merchantOrchestrationServiceException;
  }
}
