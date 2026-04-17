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

  #region Unified Classify
  /// <summary>
  /// Translates any upstream orchestration-tier exception (invoice or merchant) into the
  /// matching processing-tier outer exception while preserving OTel metric recording and
  /// structured logging via the <c>CreateAndLog*</c> builder methods. Unknown exceptions
  /// fall through to the service tier (catch-all).
  /// </summary>
  /// <remarks>
  /// Merchant orchestration validation errors are intentionally collapsed to
  /// <see cref="InvoiceProcessingServiceDependencyValidationException"/> because, from the
  /// invoice bounded context's perspective, the merchant orchestration service is a downstream
  /// dependency — its input validation failures classify as dependency-validation failures here.
  /// </remarks>
  private Exception Classify(Exception exception) => exception switch
  {
    InvoiceOrchestrationValidationException invoiceValidation
      => CreateAndLogValidationException(invoiceValidation.InnerException!),
    InvoiceOrchestrationDependencyValidationException invoiceDependencyValidation
      => CreateAndLogDependencyValidationException(invoiceDependencyValidation.InnerException!),
    InvoiceOrchestrationDependencyException invoiceDependency
      => CreateAndLogDependencyException(invoiceDependency.InnerException!),
    InvoiceOrchestrationServiceException invoiceService
      => CreateAndLogServiceException(invoiceService.InnerException!),
    MerchantOrchestrationServiceValidationException merchantValidation
      => CreateAndLogDependencyValidationException(merchantValidation.InnerException!),
    MerchantOrchestrationServiceDependencyValidationException merchantDependencyValidation
      => CreateAndLogDependencyValidationException(merchantDependencyValidation.InnerException!),
    MerchantOrchestrationServiceDependencyException merchantDependency
      => CreateAndLogDependencyException(merchantDependency.InnerException!),
    MerchantOrchestrationServiceException merchantService
      => CreateAndLogServiceException(merchantService.InnerException!),
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
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }
  #endregion

  #region Processing service exception builders
  private InvoiceProcessingServiceValidationException CreateAndLogValidationException(Exception exception)
  {
    var invoiceProcessingValidationException = new InvoiceProcessingServiceValidationException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingValidationException.Message;
    logger.LogInvoiceProcessingValidationException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "validation");
    return invoiceProcessingValidationException;
  }

  private InvoiceProcessingServiceDependencyException CreateAndLogDependencyException(Exception exception)
  {
    var invoiceProcessingDependencyException = new InvoiceProcessingServiceDependencyException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingDependencyException.Message;
    logger.LogInvoiceProcessingDependencyException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "dependency");
    return invoiceProcessingDependencyException;
  }

  private InvoiceProcessingServiceDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
  {
    var invoiceProcessingDependencyValidationException = new InvoiceProcessingServiceDependencyValidationException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingDependencyValidationException.Message;
    logger.LogInvoiceProcessingDependencyValidationException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "dependency_validation");
    return invoiceProcessingDependencyValidationException;
  }

  private InvoiceProcessingServiceException CreateAndLogServiceException(Exception exception)
  {
    var invoiceProcessingServiceException = new InvoiceProcessingServiceException(exception.Message, exception);
    var exceptionMessage = invoiceProcessingServiceException.Message;
    logger.LogInvoiceProcessingServiceException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "service");
    return invoiceProcessingServiceException;
  }
  #endregion
}
