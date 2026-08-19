namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.Modules;

public sealed partial class AnalysisProcessingService
{
  private async Task TryCatchAsync(Func<Task> returningTaskFunction)
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
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    AnalysisProcessingValidationException
      or AnalysisProcessingDependencyException
      or AnalysisProcessingDependencyValidationException
      or AnalysisProcessingServiceException
      => exception,

    AnalysisOrchestrationValidationException
      or TaxonomyCodeNotFoundException
      or InvalidAnalysisOptionsException
      or ArgumentException
      => LogAndWrapValidation(exception),

    AnalysisOrchestrationDependencyValidationException
      or AnalysisRunLeaseConflictException
      or AnalysisRunNotFoundException
      => LogAndWrapDependencyValidation(exception),

    AnalysisOrchestrationDependencyException
      or AnalysisRunCosmosDbRateLimitException
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private AnalysisProcessingValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new AnalysisProcessingValidationException(exception);
    logger.LogAnalysisProcessingValidationException();
    return outer;
  }

  private AnalysisProcessingDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new AnalysisProcessingDependencyException(exception);
    logger.LogAnalysisProcessingDependencyException();
    return outer;
  }

  private AnalysisProcessingDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new AnalysisProcessingDependencyValidationException(exception);
    logger.LogAnalysisProcessingDependencyValidationException();
    return outer;
  }

  private AnalysisProcessingServiceException LogAndWrapService(Exception exception)
  {
    var outer = new AnalysisProcessingServiceException(exception);
    logger.LogAnalysisProcessingServiceException();
    return outer;
  }
}
