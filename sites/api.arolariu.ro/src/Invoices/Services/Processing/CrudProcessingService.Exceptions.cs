namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

public partial class CrudProcessingService
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

  private delegate Task<InvoiceAnalysisExecutionResult> CallbackFunctionForTasksWithInvoiceAnalysisExecutionResultReturn();

  private delegate Task<MerchantAnalysisExecutionResult> CallbackFunctionForTasksWithMerchantAnalysisExecutionResultReturn();
  #endregion

  #region Unified Classify
  /// <summary>
  /// Translates any upstream orchestration-tier exception (invoice or merchant) into the
  /// matching processing-tier outer exception while preserving OTel metric recording and
  /// structured logging via the <c>CreateAndLog*</c> builder methods. Unknown exceptions
  /// fall through to the service tier (catch-all).
  /// </summary>
  /// <remarks>
  /// Merchant orchestration validation errors are intentionally collapsed to
  /// <see cref="CrudProcessingServiceDependencyValidationException"/> because, from the
  /// invoice bounded context's perspective, the merchant orchestration service is a downstream
  /// dependency — its input validation failures classify as dependency-validation failures here.
  /// </remarks>
  private Exception Classify(Exception exception) => exception switch
  {
    InvoiceOrchestrationValidationException invoiceValidation
      => CreateAndLogValidationException(invoiceValidation.InnerException ?? invoiceValidation),
    InvoiceOrchestrationDependencyValidationException invoiceDependencyValidation
      => CreateAndLogDependencyValidationException(invoiceDependencyValidation.InnerException ?? invoiceDependencyValidation),
    InvoiceOrchestrationDependencyException invoiceDependency
      => CreateAndLogDependencyException(invoiceDependency.InnerException ?? invoiceDependency),
    InvoiceOrchestrationServiceException invoiceService
      => CreateAndLogServiceException(invoiceService.InnerException ?? invoiceService),
    MerchantOrchestrationServiceValidationException merchantValidation
      => CreateAndLogDependencyValidationException(merchantValidation.InnerException ?? merchantValidation),
    MerchantOrchestrationServiceDependencyValidationException merchantDependencyValidation
      => CreateAndLogDependencyValidationException(merchantDependencyValidation.InnerException ?? merchantDependencyValidation),
    MerchantOrchestrationServiceDependencyException merchantDependency
      => CreateAndLogDependencyException(merchantDependency.InnerException ?? merchantDependency),
    MerchantOrchestrationServiceException merchantService
      => CreateAndLogServiceException(merchantService.InnerException ?? merchantService),
    _ => CreateAndLogServiceException(exception),
  };
  #endregion

  #region TryCatchAync method
  private async Task TryCatchAsync(CallbackFunctionForTasksWithNoReturn callbackFunction)
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

  private async Task<Invoice> TryCatchAsync(CallbackFunctionForTasksWithInvoiceReturn callbackFunction)
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

  private async Task<IEnumerable<Invoice>> TryCatchAsync(CallbackFunctionForTasksWithInvoiceListReturn callbackFunction)
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

  private async Task<Product> TryCatchAsync(CallbackFunctionForTasksWithProductReturn callbackFunction)
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

  private async Task<IEnumerable<Product>> TryCatchAsync(CallbackFunctionForTasksWithProductListReturn callbackFunction)
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

  private async Task<Merchant> TryCatchAsync(CallbackFunctionForTasksWithMerchantReturn callbackFunction)
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

  private async Task<IEnumerable<Merchant>> TryCatchAsync(CallbackFunctionForTasksWithMerchantListReturn callbackFunction)
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

  private async Task<IDictionary<string, object>> TryCatchAsync(CallbackFunctionForTasksWithMetadataReturn callbackFunction)
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

  private async Task<InvoiceScan> TryCatchAsync(CallbackFunctionForTasksWithInvoiceScanReturn callbackFunction)
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

  private async Task<IEnumerable<InvoiceScan>> TryCatchAsync(CallbackFunctionForTasksWithInvoiceScanListReturn callbackFunction)
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

  private async Task<InvoiceAnalysisExecutionResult> TryCatchAsync(
    CallbackFunctionForTasksWithInvoiceAnalysisExecutionResultReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private async Task<MerchantAnalysisExecutionResult> TryCatchAsync(
    CallbackFunctionForTasksWithMerchantAnalysisExecutionResultReturn callbackFunction)
  {
    try
    {
      return await callbackFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }
  #endregion

  #region Processing service exception builders
  private CrudProcessingServiceValidationException CreateAndLogValidationException(Exception exception)
  {
    var crudProcessingValidationException = new CrudProcessingServiceValidationException(exception.Message, exception);
    var exceptionMessage = crudProcessingValidationException.Message;
    logger.LogCrudProcessingValidationException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "validation");
    return crudProcessingValidationException;
  }

  private CrudProcessingServiceDependencyException CreateAndLogDependencyException(Exception exception)
  {
    var crudProcessingDependencyException = new CrudProcessingServiceDependencyException(exception.Message, exception);
    var exceptionMessage = crudProcessingDependencyException.Message;
    logger.LogCrudProcessingDependencyException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "dependency");
    return crudProcessingDependencyException;
  }

  private CrudProcessingServiceDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
  {
    var crudProcessingDependencyValidationException = new CrudProcessingServiceDependencyValidationException(exception.Message, exception);
    var exceptionMessage = crudProcessingDependencyValidationException.Message;
    logger.LogCrudProcessingDependencyValidationException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "dependency_validation");
    return crudProcessingDependencyValidationException;
  }

  private CrudProcessingServiceException CreateAndLogServiceException(Exception exception)
  {
    var crudProcessingServiceException = new CrudProcessingServiceException(exception.Message, exception);
    var exceptionMessage = crudProcessingServiceException.Message;
    logger.LogCrudProcessingServiceException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "service");
    return crudProcessingServiceException;
  }
  #endregion
}
