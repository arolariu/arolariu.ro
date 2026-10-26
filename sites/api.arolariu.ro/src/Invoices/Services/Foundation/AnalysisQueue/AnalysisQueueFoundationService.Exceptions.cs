namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;

using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Modules;

using Azure;

public sealed partial class AnalysisQueueFoundationService
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
    ArgumentException
      => LogValidation(exception),

    JsonException
      or InvalidOperationException
      => LogDependencyValidation(exception),

    RequestFailedException
      or HttpRequestException
      or TimeoutException
      => LogDependency(exception),

    _ => LogService(exception),
  };

  private AnalysisFoundationValidationException LogValidation(Exception exception)
  {
    logger.LogAnalysisQueueValidationException();
    return new AnalysisFoundationValidationException(exception);
  }

  private AnalysisFoundationDependencyValidationException LogDependencyValidation(Exception exception)
  {
    logger.LogAnalysisQueueDependencyValidationException();
    return new AnalysisFoundationDependencyValidationException(exception);
  }

  private AnalysisFoundationDependencyException LogDependency(Exception exception)
  {
    logger.LogAnalysisQueueDependencyException();
    return new AnalysisFoundationDependencyException(exception);
  }

  private AnalysisFoundationServiceException LogService(Exception exception)
  {
    logger.LogAnalysisQueueServiceException();
    return new AnalysisFoundationServiceException(exception);
  }
}
