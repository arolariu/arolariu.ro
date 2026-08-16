namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;

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
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
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
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  /// <summary>
  /// Executes a single best-effort capability call: catches only the four typed analysis-foundation exceptions,
  /// letting <see cref="OperationCanceledException"/> and every other exception type propagate unchanged, and
  /// returns <see langword="null"/> (omitting the capability from <paramref name="completedCapabilities"/>)
  /// instead of throwing when the capability itself fails.
  /// </summary>
  /// <typeparam name="TResult">The capability's transient result type.</typeparam>
  /// <param name="capability">The capability being attempted, recorded on success.</param>
  /// <param name="operation">The capability call to attempt.</param>
  /// <param name="completedCapabilities">The shared, thread-safe collector of capabilities that produced a usable result.</param>
  /// <returns>The capability's result on success, or <see langword="null"/> when the capability failed.</returns>
  private static async Task<TResult?> ExecuteBestEffortAsync<TResult>(
    AnalysisCapability capability,
    Func<Task<TResult>> operation,
    ConcurrentQueue<AnalysisCapability> completedCapabilities)
    where TResult : class
  {
    try
    {
      TResult result = await operation().ConfigureAwait(false);
      completedCapabilities.Enqueue(capability);
      return result;
    }
    catch (OperationCanceledException)
    {
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception) when (
      exception is AnalysisFoundationValidationException
      or AnalysisFoundationDependencyException
      or AnalysisFoundationDependencyValidationException
      or AnalysisFoundationServiceException)
    {
      // Best-effort: only typed analysis-foundation capability failures are swallowed. The capability's
      // section is omitted from the final result instead of failing the entire run.
      return null;
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    AnalysisFoundationValidationException => LogAndWrapValidation(exception.InnerException ?? exception),
    AnalysisFoundationDependencyValidationException => LogAndWrapDependencyValidation(exception.InnerException ?? exception),
    AnalysisFoundationDependencyException => LogAndWrapDependency(exception.InnerException ?? exception),
    AnalysisFoundationServiceException => LogAndWrapService(exception.InnerException ?? exception),
    ArgumentException => LogAndWrapValidation(exception),
    _ => LogAndWrapService(exception),
  };

  private AnalysisOrchestrationValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new AnalysisOrchestrationValidationException(exception);
    logger.LogAnalysisOrchestrationValidationException(outer.Message);
    return outer;
  }

  private AnalysisOrchestrationDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new AnalysisOrchestrationDependencyException(exception);
    logger.LogAnalysisOrchestrationDependencyException(outer.Message);
    return outer;
  }

  private AnalysisOrchestrationDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new AnalysisOrchestrationDependencyValidationException(exception);
    logger.LogAnalysisOrchestrationDependencyValidationException(outer.Message);
    return outer;
  }

  private AnalysisOrchestrationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new AnalysisOrchestrationServiceException(exception);
    logger.LogAnalysisOrchestrationServiceException(outer.Message);
    return outer;
  }
}
