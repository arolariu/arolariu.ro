namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

public sealed partial class AnalysisOrchestrationService
{
  /// <summary>Executes the resolved merchant capability graph without persisting aggregate state.</summary>
  /// <param name="message">The durable merchant request containing resolved capability options.</param>
  /// <param name="merchant">The merchant snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel the capability graph.</param>
  /// <returns>The immutable patch, completed capabilities, and first observed failure reason.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the message or merchant is null.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationServiceException">
  /// Thrown when an unclassified orchestration failure prevents producing an execution result.
  /// </exception>
  public async Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    AnalysisQueueMessage message,
    Merchant merchant,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ExecuteMerchantAnalysisAsync));
      ArgumentNullException.ThrowIfNull(message);
      ArgumentNullException.ThrowIfNull(merchant);
      activity?.SetTag("analysis.correlation_id", message.CorrelationId.ToString());
      activity?.SetTag("analysis.target_id", message.TargetId.ToString());

      cancellationToken.ThrowIfCancellationRequested();

      if (message.TargetType != AnalysisTargetType.Merchant || message.MerchantOptions is null)
      {
        return CreateMerchantFailureResult(message, AnalysisFailureReason.Validation);
      }

      MerchantAnalysisOptions options = message.MerchantOptions;
      var completedCapabilities = new ConcurrentQueue<AnalysisCapability>();
      var failureReasons = new ConcurrentQueue<AnalysisFailureReason>();

      MerchantClassificationResult? classification = null;
      MerchantDescriptionResult? description = null;

      Task<MerchantClassificationResult?> classificationTask = options.MerchantClassification
        ? ExecuteBestEffortAsync(
          message,
          AnalysisCapability.MerchantClassification,
          () => ClassifyMerchantAsync(
            merchant,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
        : Task.FromResult<MerchantClassificationResult?>(null);
      Task<MerchantDescriptionResult?> descriptionTask = options.DescriptionGeneration
        ? ExecuteBestEffortAsync(
          message,
          AnalysisCapability.DescriptionGeneration,
          () => GenerateMerchantDescriptionAsync(
            merchant,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
        : Task.FromResult<MerchantDescriptionResult?>(null);

      await Task.WhenAll(classificationTask, descriptionTask).ConfigureAwait(false);
      classification = await classificationTask.ConfigureAwait(false);
      description = await descriptionTask.ConfigureAwait(false);

      var patch = new MerchantAnalysisPatch(classification, description);

      return new MerchantAnalysisExecutionResult(
        message,
        patch,
        [.. completedCapabilities],
        failureReasons.TryPeek(out AnalysisFailureReason failureReason) ? failureReason : null);
    }).ConfigureAwait(false);

  private static MerchantAnalysisExecutionResult CreateMerchantFailureResult(
    AnalysisQueueMessage message,
    AnalysisFailureReason failureReason) =>
    new(
      message,
      new MerchantAnalysisPatch(null, null),
      CompletedCapabilities: [],
      FailureReason: failureReason);
}
