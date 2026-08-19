namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisProcessingService
{
  /// <inheritdoc/>
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

      MerchantClassificationResult? classification = null;
      MerchantDescriptionResult? description = null;

      if (options.MerchantClassification)
      {
        classification = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.MerchantClassification,
          () => classificationOrchestrationService.ClassifyMerchantAsync(
            merchant,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      if (options.DescriptionGeneration)
      {
        description = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.DescriptionGeneration,
          () => analysisOrchestrationService.GenerateMerchantDescriptionAsync(
            merchant,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      var patch = new MerchantAnalysisPatch(classification, description);

      return new MerchantAnalysisExecutionResult(message, patch, [.. completedCapabilities]);
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
