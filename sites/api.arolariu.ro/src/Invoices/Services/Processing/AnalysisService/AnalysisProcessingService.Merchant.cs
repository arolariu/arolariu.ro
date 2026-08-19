namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisProcessingService
{
  /// <inheritdoc/>
  public async Task<MerchantAnalysisExecutionResult> ExecuteMerchantRunAsync(
    AnalysisRun run,
    Merchant merchant,
    string leaseOwner,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ExecuteMerchantRunAsync));
      ArgumentNullException.ThrowIfNull(run);
      ArgumentNullException.ThrowIfNull(merchant);
      ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);
      activity?.SetTag("analysis.run_id", run.Id.ToString());
      activity?.SetTag("analysis.target_id", run.TargetId.ToString());

      cancellationToken.ThrowIfCancellationRequested();

      if (run.TargetType != AnalysisTargetType.Merchant || run.MerchantOptions is null)
      {
        return CreateMerchantFailureResult(run, "INVALID_RUN_CONFIGURATION", AnalysisFailureReason.Validation);
      }

      MerchantAnalysisOptions options = run.MerchantOptions;
      var completedCapabilities = new ConcurrentQueue<AnalysisCapability>();

      MerchantClassificationResult? classification = null;
      MerchantDescriptionResult? description = null;

      if (options.MerchantClassification)
      {
        classification = await ExecuteBestEffortAsync(
          run,
          AnalysisCapability.MerchantClassification,
          () => classificationOrchestrationService.ClassifyMerchantAsync(merchant, run.Id, cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      if (options.DescriptionGeneration)
      {
        description = await ExecuteBestEffortAsync(
          run,
          AnalysisCapability.DescriptionGeneration,
          () => analysisOrchestrationService.GenerateMerchantDescriptionAsync(merchant, run.Id, cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      var patch = new MerchantAnalysisPatch(classification, description);

      return new MerchantAnalysisExecutionResult(run, patch, [.. completedCapabilities]);
    }).ConfigureAwait(false);

  private static MerchantAnalysisExecutionResult CreateMerchantFailureResult(
    AnalysisRun run,
    string failureCode,
    AnalysisFailureReason failureReason) =>
    new(
      run,
      new MerchantAnalysisPatch(null, null),
      CompletedCapabilities: [],
      FailureCode: failureCode,
      FailureReason: failureReason);
}
