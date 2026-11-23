namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.Modules;

public sealed partial class AnalysisOrchestrationService
{
  private async Task TryCatchAsync(Func<Task> operation)
  {
    try
    {
      await operation().ConfigureAwait(false);
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

  private async Task<TResult> TryCatchAsync<TResult>(Func<Task<TResult>> operation)
  {
    try
    {
      return await operation().ConfigureAwait(false);
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
    AnalysisFoundationValidationException
      => LogAndWrapValidation(exception.InnerException ?? exception),
    AnalysisFoundationDependencyValidationException
      => LogAndWrapDependencyValidation(exception.InnerException ?? exception),
    AnalysisFoundationDependencyException
      => LogAndWrapDependency(exception.InnerException ?? exception),
    AnalysisFoundationServiceException
      => LogAndWrapService(exception.InnerException ?? exception),
    ArgumentException
      => LogAndWrapValidation(exception),
    _ => LogAndWrapService(exception),
  };

  private AnalysisOrchestrationValidationException LogAndWrapValidation(Exception exception)
  {
    logger.LogAnalysisOrchestrationValidationException();
    return new AnalysisOrchestrationValidationException(exception);
  }

  private AnalysisOrchestrationDependencyException LogAndWrapDependency(Exception exception)
  {
    logger.LogAnalysisOrchestrationDependencyException();
    return new AnalysisOrchestrationDependencyException(exception);
  }

  private AnalysisOrchestrationDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    logger.LogAnalysisOrchestrationDependencyValidationException();
    return new AnalysisOrchestrationDependencyValidationException(exception);
  }

  private AnalysisOrchestrationServiceException LogAndWrapService(Exception exception)
  {
    logger.LogAnalysisOrchestrationServiceException();
    return new AnalysisOrchestrationServiceException(exception);
  }
}
