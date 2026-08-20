namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Modules;
public sealed partial class InvoiceProcessingService
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
  /// <see cref="InvoiceProcessingServiceDependencyValidationException"/> because, from the
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
    AnalysisOrchestrationValidationException analysisValidation
      => CreateAndLogValidationException(analysisValidation.InnerException ?? analysisValidation),
    AnalysisOrchestrationDependencyValidationException analysisDependencyValidation
      => CreateAndLogDependencyValidationException(analysisDependencyValidation.InnerException ?? analysisDependencyValidation),
    AnalysisOrchestrationDependencyException analysisDependency
      => CreateAndLogDependencyException(analysisDependency.InnerException ?? analysisDependency),
    AnalysisOrchestrationServiceException analysisService
      => CreateAndLogServiceException(analysisService.InnerException ?? analysisService),
    ArgumentException
      => CreateAndLogValidationException(exception),
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
  private InvoiceProcessingServiceValidationException CreateAndLogValidationException(Exception exception)
  {
    var processingValidationException = new InvoiceProcessingServiceValidationException(exception.Message, exception);
    var exceptionMessage = processingValidationException.Message;
    logger.LogInvoiceProcessingValidationException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "validation");
    return processingValidationException;
  }

  private InvoiceProcessingServiceDependencyException CreateAndLogDependencyException(Exception exception)
  {
    var processingDependencyException = new InvoiceProcessingServiceDependencyException(exception.Message, exception);
    var exceptionMessage = processingDependencyException.Message;
    logger.LogInvoiceProcessingDependencyException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "dependency");
    return processingDependencyException;
  }

  private InvoiceProcessingServiceDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
  {
    var processingDependencyValidationException = new InvoiceProcessingServiceDependencyValidationException(exception.Message, exception);
    var exceptionMessage = processingDependencyValidationException.Message;
    logger.LogInvoiceProcessingDependencyValidationException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "dependency_validation");
    return processingDependencyValidationException;
  }

  private InvoiceProcessingServiceException CreateAndLogServiceException(Exception exception)
  {
    var processingServiceException = new InvoiceProcessingServiceException(exception.Message, exception);
    var exceptionMessage = processingServiceException.Message;
    logger.LogInvoiceProcessingServiceException(exceptionMessage);
    InvoiceMetrics.RecordOperation("unknown", "invoice", "failure", failureReason: "service");
    return processingServiceException;
  }
  #endregion

  private async Task TryCatchAnalysisAsync(Func<Task> returningTaskFunction)
  {
    try
    {
      await returningTaskFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      throw ClassifyAnalysis(exception);
    }
  }

  private async Task<TResult> TryCatchAnalysisAsync<TResult>(Func<Task<TResult>> returningTaskFunction)
  {
    try
    {
      return await returningTaskFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      throw ClassifyAnalysis(exception);
    }
  }

  private Exception ClassifyAnalysis(Exception exception) => exception switch
  {
    InvoiceProcessingServiceValidationException
      or InvoiceProcessingServiceDependencyException
      or InvoiceProcessingServiceDependencyValidationException
      or InvoiceProcessingServiceException
      => exception,

    AnalysisOrchestrationValidationException
      or TaxonomyCodeNotFoundException
      or InvalidAnalysisOptionsException
      or ArgumentException
      => LogAndWrapValidation(exception),

    AnalysisOrchestrationDependencyValidationException
      => LogAndWrapDependencyValidation(exception),

    AnalysisOrchestrationDependencyException
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private InvoiceProcessingServiceValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new InvoiceProcessingServiceValidationException(exception);
    logger.LogInvoiceProcessingValidationException(exception.Message);
    return outer;
  }

  private InvoiceProcessingServiceDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new InvoiceProcessingServiceDependencyException(exception);
    logger.LogInvoiceProcessingDependencyException(exception.Message);
    return outer;
  }

  private InvoiceProcessingServiceDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new InvoiceProcessingServiceDependencyValidationException(exception);
    logger.LogInvoiceProcessingDependencyValidationException(exception.Message);
    return outer;
  }

  private InvoiceProcessingServiceException LogAndWrapService(Exception exception)
  {
    var outer = new InvoiceProcessingServiceException(exception);
    logger.LogInvoiceProcessingServiceException(exception.Message);
    return outer;
  }
}
