namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;

using Microsoft.Azure.Cosmos;

public partial class AnalysisRunFoundationService
{
  private delegate Task ReturningTaskFunction();

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

  /// <summary>Executes an operation returning a non-null <see cref="AnalysisRun"/>, classifying any thrown exception.</summary>
  private async Task<AnalysisRun> TryCatchAsync(Func<Task<AnalysisRun>> returningAnalysisRunFunction)
  {
    try
    {
      return await returningAnalysisRunFunction().ConfigureAwait(false);
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

  /// <summary>Executes an operation that may legitimately return no <see cref="AnalysisRun"/> (e.g. no claimable run), classifying any thrown exception.</summary>
  private async Task<AnalysisRun?> TryCatchNullableAsync(Func<Task<AnalysisRun?>> returningNullableAnalysisRunFunction)
  {
    try
    {
      return await returningNullableAnalysisRunFunction().ConfigureAwait(false);
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

  /// <summary>Executes an operation returning a pending-run count projection, classifying any thrown exception.</summary>
  private async Task<IReadOnlyDictionary<AnalysisTargetType, long>> TryCatchAsync(
    Func<Task<IReadOnlyDictionary<AnalysisTargetType, long>>> returningCountsFunction)
  {
    try
    {
      return await returningCountsFunction().ConfigureAwait(false);
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

  private Exception Classify(Exception exception) => exception switch
  {
    ArgumentException or InvalidAnalysisRunTransitionException
      => LogAndWrapValidation(exception),

    AnalysisRunNotFoundException
      or AnalysisRunLeaseConflictException
      or AnalysisRunCosmosDbRateLimitException
      => LogAndWrapDependencyValidation(exception),

    CosmosException
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private AnalysisFoundationValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new AnalysisFoundationValidationException(exception);
    logger.LogAnalysisRunValidationException();
    return outer;
  }

  private AnalysisFoundationDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new AnalysisFoundationDependencyException(exception);
    logger.LogAnalysisRunDependencyException();
    return outer;
  }

  private AnalysisFoundationDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new AnalysisFoundationDependencyValidationException(exception);
    logger.LogAnalysisRunDependencyValidationException();
    return outer;
  }

  private AnalysisFoundationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new AnalysisFoundationServiceException(exception);
    logger.LogAnalysisRunServiceException();
    return outer;
  }
}
