namespace arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;

using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using Azure;

public sealed partial class DocumentAnalysisFoundationService
{
  private async Task<ReceiptExtractionResult> TryCatchAsync(
    Func<Task<ReceiptExtractionResult>> returningFunction,
    CancellationToken cancellationToken)
  {
    try
    {
      return await returningFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
    {
      throw LogAndWrapDependency(new TimeoutException("The document-analysis dependency timed out.", exception));
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
    IValidationException
      => LogAndWrapValidation(exception),

    IDependencyException
      => LogAndWrapDependency(exception),

    ArgumentException
      => LogAndWrapValidation(exception),

    RequestFailedException requestFailedException when IsDependencyValidation(requestFailedException)
      => LogAndWrapDependencyValidation(exception),

    InvalidStructuredOutputException
      => LogAndWrapDependency(exception),

    RequestFailedException
      or HttpRequestException
      or TimeoutException
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private static bool IsDependencyValidation(RequestFailedException exception) =>
    exception.Status is >= 400 and < 500
    && exception.Status is not 408
    && exception.Status is not 429;

  private AnalysisFoundationValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new AnalysisFoundationValidationException(exception);
    logger.LogDocumentAnalysisValidationException();
    return outer;
  }

  private AnalysisFoundationDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new AnalysisFoundationDependencyException(exception);
    logger.LogDocumentAnalysisDependencyException();
    return outer;
  }

  private AnalysisFoundationDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new AnalysisFoundationDependencyValidationException(exception);
    logger.LogDocumentAnalysisDependencyValidationException();
    return outer;
  }

  private AnalysisFoundationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new AnalysisFoundationServiceException(exception);
    logger.LogDocumentAnalysisServiceException();
    return outer;
  }
}
