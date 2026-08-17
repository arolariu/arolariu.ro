namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.Modules;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

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
  /// <remarks>
  /// <para>This is the single choke point through which every capability invocation flows, so it is also where
  /// capability outcome and duration telemetry is emitted. Only bounded dimensions leave this method: the
  /// capability enum, the outcome enum, a bounded failure reason, the run identifier, and a duration.</para>
  /// </remarks>
  /// <typeparam name="TResult">The capability's transient result type.</typeparam>
  /// <param name="run">The claimed run the capability belongs to, used to correlate telemetry.</param>
  /// <param name="capability">The capability being attempted, recorded on success.</param>
  /// <param name="operation">The capability call to attempt.</param>
  /// <param name="completedCapabilities">The shared, thread-safe collector of capabilities that produced a usable result.</param>
  /// <returns>The capability's result on success, or <see langword="null"/> when the capability failed.</returns>
  private async Task<TResult?> ExecuteBestEffortAsync<TResult>(
    AnalysisRun run,
    AnalysisCapability capability,
    Func<Task<TResult>> operation,
    ConcurrentQueue<AnalysisCapability> completedCapabilities)
    where TResult : class
  {
    long startedAt = Stopwatch.GetTimestamp();

    try
    {
      TResult result = await operation().ConfigureAwait(false);
      completedCapabilities.Enqueue(capability);
      RecordCapabilityOutcome(run, capability, AnalysisOutcome.Success, startedAt, failureReason: null);
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
      RecordCapabilityOutcome(run, capability, AnalysisOutcome.Failure, startedAt, ResolveFailureReason(exception));
      return null;
    }
  }

  /// <summary>
  /// Emits the capability outcome metric plus its correlated structured log entries.
  /// </summary>
  /// <param name="run">The claimed run the capability belongs to.</param>
  /// <param name="capability">The capability that just finished.</param>
  /// <param name="outcome">The capability outcome.</param>
  /// <param name="startedAtTimestamp">The <see cref="Stopwatch.GetTimestamp"/> value captured before the call.</param>
  /// <param name="failureReason">The bounded failure reason, when the capability failed.</param>
  private void RecordCapabilityOutcome(
    AnalysisRun run,
    AnalysisCapability capability,
    AnalysisOutcome outcome,
    long startedAtTimestamp,
    AnalysisFailureReason? failureReason)
  {
    double durationMs = Stopwatch.GetElapsedTime(startedAtTimestamp).TotalMilliseconds;

    InvoiceMetrics.RecordCapabilityOutcome(capability, outcome, durationMs, failureReason);
    logger.LogAnalysisCapabilityOutcomeObserved(run.Id, capability, outcome, durationMs);

    if (!failureReason.HasValue)
    {
      return;
    }

    logger.LogAnalysisCapabilityFailureReasonObserved(run.Id, capability, failureReason.Value);

    // Content-filter/refusal is counted at the generative foundation, which is the only layer that can tell a
    // provider refusal apart from a schema violation. Only the schema violation is counted here.
    if (failureReason.Value == AnalysisFailureReason.InvalidStructuredOutput)
    {
      InvoiceMetrics.RecordCapabilityInvalidStructuredOutput(capability);
      logger.LogAnalysisInvalidStructuredOutputDetected(capability);
    }
  }

  /// <summary>
  /// Maps a typed analysis-foundation failure onto its bounded telemetry failure reason.
  /// </summary>
  /// <remarks>
  /// <para>Provider refusals and schema violations both surface as an <see cref="AnalysisFoundationDependencyException"/>
  /// wrapping an <see cref="InvalidStructuredOutputException"/>. They are told apart by the marker the generative
  /// foundation service stamps onto the refusal instance, so operators can alert on content filtering separately
  /// from contract violations.</para>
  /// </remarks>
  /// <param name="exception">The typed analysis-foundation exception raised by the capability.</param>
  /// <returns>The bounded failure reason.</returns>
  private static AnalysisFailureReason ResolveFailureReason(Exception exception)
  {
    Exception inner = exception.InnerException ?? exception;

    return inner switch
    {
      InvalidStructuredOutputException structured when GenerativeAnalysisRefusalMarker.IsRefusal(structured)
        => AnalysisFailureReason.ContentFilter,
      InvalidStructuredOutputException => AnalysisFailureReason.InvalidStructuredOutput,
      TaxonomyCodeNotFoundException => AnalysisFailureReason.Taxonomy,
      _ => exception switch
      {
        AnalysisFoundationValidationException => AnalysisFailureReason.Validation,
        AnalysisFoundationDependencyValidationException => AnalysisFailureReason.DependencyValidation,
        AnalysisFoundationDependencyException => AnalysisFailureReason.Dependency,
        _ => AnalysisFailureReason.Service,
      },
    };
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
    logger.LogAnalysisOrchestrationValidationException();
    return outer;
  }

  private AnalysisOrchestrationDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new AnalysisOrchestrationDependencyException(exception);
    logger.LogAnalysisOrchestrationDependencyException();
    return outer;
  }

  private AnalysisOrchestrationDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new AnalysisOrchestrationDependencyValidationException(exception);
    logger.LogAnalysisOrchestrationDependencyValidationException();
    return outer;
  }

  private AnalysisOrchestrationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new AnalysisOrchestrationServiceException(exception);
    logger.LogAnalysisOrchestrationServiceException();
    return outer;
  }
}
