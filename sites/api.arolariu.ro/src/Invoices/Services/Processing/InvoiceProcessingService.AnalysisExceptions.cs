namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Modules;

public sealed partial class InvoiceProcessingService
{
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
