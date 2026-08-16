namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Modules;

public sealed partial class AnalysisProcessingService
{
  private delegate Task ReturningTaskFunction();
  private delegate Task<bool> ReturningBooleanFunction();
  private delegate Task<AnalysisAcceptedResponseDto> ReturningAcceptedResponseFunction();

  private async Task TryCatchAsync(ReturningTaskFunction returningTaskFunction)
  {
    try
    {
      await returningTaskFunction().ConfigureAwait(false);
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

  private async Task<bool> TryCatchAsync(ReturningBooleanFunction returningBooleanFunction)
  {
    try
    {
      return await returningBooleanFunction().ConfigureAwait(false);
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

  private async Task<AnalysisAcceptedResponseDto> TryCatchAsync(ReturningAcceptedResponseFunction returningAcceptedResponseFunction)
  {
    try
    {
      return await returningAcceptedResponseFunction().ConfigureAwait(false);
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

  /// <summary>
  /// Maps a raised exception onto the processing layer's outer exception taxonomy.
  /// </summary>
  /// <remarks>
  /// <para>Exceptions this layer has already classified - the heartbeat's lease-loss failure being the canonical case -
  /// pass through unchanged so a structural failure is not re-labelled as a generic service fault.</para>
  /// </remarks>
  /// <param name="exception">The raised exception.</param>
  /// <returns>The classified outer exception to throw.</returns>
  private Exception Classify(Exception exception) => exception switch
  {
    AnalysisProcessingValidationException
      or AnalysisProcessingDependencyException
      or AnalysisProcessingDependencyValidationException
      or AnalysisProcessingServiceException
      => exception,

    AnalysisOrchestrationValidationException
      or InvoiceOrchestrationValidationException
      or MerchantOrchestrationServiceValidationException
      or TaxonomyCodeNotFoundException
      or InvalidAnalysisOptionsException
      or ArgumentException
      => LogAndWrapValidation(exception),

    AnalysisOrchestrationDependencyValidationException
      or InvoiceOrchestrationDependencyValidationException
      or MerchantOrchestrationServiceDependencyValidationException
      or AnalysisRunLeaseConflictException
      or AnalysisRunNotFoundException
      => LogAndWrapDependencyValidation(exception),

    AnalysisOrchestrationDependencyException
      or InvoiceOrchestrationDependencyException
      or MerchantOrchestrationServiceDependencyException
      or AnalysisRunCosmosDbRateLimitException
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private AnalysisProcessingValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new AnalysisProcessingValidationException(exception);
    logger.LogAnalysisProcessingValidationException(outer.Message);
    return outer;
  }

  private AnalysisProcessingDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new AnalysisProcessingDependencyException(exception);
    logger.LogAnalysisProcessingDependencyException(outer.Message);
    return outer;
  }

  private AnalysisProcessingDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new AnalysisProcessingDependencyValidationException(exception);
    logger.LogAnalysisProcessingDependencyValidationException(outer.Message);
    return outer;
  }

  private AnalysisProcessingServiceException LogAndWrapService(Exception exception)
  {
    var outer = new AnalysisProcessingServiceException(exception);
    logger.LogAnalysisProcessingServiceException(outer.Message);
    return outer;
  }
}
