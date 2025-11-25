namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

public partial class InvoiceProcessingService
{
  #region Delegates
  private delegate Task CallbackFunctionForTasksWithNoReturn();

  private delegate Task<Invoice> CallbackFunctionForTasksWithInvoiceReturn();

  private delegate Task<IEnumerable<Invoice>> CallbackFunctionForTasksWithInvoiceListReturn();

  private delegate Task<Product> CallbackFunctionForTasksWithProductReturn();

  private delegate Task<IEnumerable<Product>> CallbackFunctionForTasksWithProductListReturn();

  private delegate Task<Merchant> CallbackFunctionForTasksWithMerchantReturn();

  private delegate Task<IEnumerable<Merchant>> CallbackFunctionForTasksWithMerchantListReturn();

  private delegate Task<IDictionary<string, object>> CallbackFunctionForTasksWithMetadataReturn();

  private delegate Task<InvoiceScan> CallbackFunctionForTasksWithInvoiceScanReturn();

  private delegate Task<IEnumerable<InvoiceScan>> CallbackFunctionForTasksWithInvoiceScanListReturn();
  #endregion

  #region TryCatchAync method
  private async Task TryCatchAsync(CallbackFunctionForTasksWithNoReturn callbackFunction)
  {
    try
    {
      await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<Invoice> TryCatchAsync(CallbackFunctionForTasksWithInvoiceReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<IEnumerable<Invoice>> TryCatchAsync(CallbackFunctionForTasksWithInvoiceListReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<Product> TryCatchAsync(CallbackFunctionForTasksWithProductReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<IEnumerable<Product>> TryCatchAsync(CallbackFunctionForTasksWithProductListReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<Merchant> TryCatchAsync(CallbackFunctionForTasksWithMerchantReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (MerchantOrchestrationServiceValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (MerchantOrchestrationServiceDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (MerchantOrchestrationServiceDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (MerchantOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<IEnumerable<Merchant>> TryCatchAsync(CallbackFunctionForTasksWithMerchantListReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (MerchantOrchestrationServiceValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (MerchantOrchestrationServiceDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (MerchantOrchestrationServiceDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (MerchantOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<IDictionary<string, object>> TryCatchAsync(CallbackFunctionForTasksWithMetadataReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<InvoiceScan> TryCatchAsync(CallbackFunctionForTasksWithInvoiceScanReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }

  private async Task<IEnumerable<InvoiceScan>> TryCatchAsync(CallbackFunctionForTasksWithInvoiceScanListReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (InvoiceOrchestrationValidationException exception)
    {
      throw CreateAndLogValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyException exception)
    {
      throw CreateAndLogDependencyException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationDependencyValidationException exception)
    {
      throw CreateAndLogDependencyValidationException(exception.InnerException!);
    }
    catch (InvoiceOrchestrationServiceException exception)
    {
      throw CreateAndLogServiceException(exception.InnerException!);
    }
    catch (Exception exception)
    {
      throw CreateAndLogServiceException(exception);
    }
  }
  #endregion

  #region Processing service exception builders
  private InvoiceProcessingServiceValidationException CreateAndLogValidationException(Exception exception)
  {
    var invoiceProcessingValidationException = new InvoiceProcessingServiceValidationException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingValidationException.Message;
    logger.LogInvoiceProcessingValidationException(exceptionMessage);
    return invoiceProcessingValidationException;
  }

  private InvoiceProcessingServiceDependencyException CreateAndLogDependencyException(Exception exception)
  {
    var invoiceProcessingDependencyException = new InvoiceProcessingServiceDependencyException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingDependencyException.Message;
    logger.LogInvoiceProcessingDependencyException(exceptionMessage);
    return invoiceProcessingDependencyException;
  }

  private InvoiceProcessingServiceDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
  {
    var invoiceProcessingDependencyValidationException = new InvoiceProcessingServiceDependencyValidationException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingDependencyValidationException.Message;
    logger.LogInvoiceProcessingDependencyValidationException(exceptionMessage);
    return invoiceProcessingDependencyValidationException;
  }

  private InvoiceProcessingServiceException CreateAndLogServiceException(Exception exception)
  {
    var invoiceProcessingServiceException = new InvoiceProcessingServiceException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingServiceException.Message;
    logger.LogInvoiceProcessingServiceException(exceptionMessage);
    return invoiceProcessingServiceException;
  }
  #endregion
}
