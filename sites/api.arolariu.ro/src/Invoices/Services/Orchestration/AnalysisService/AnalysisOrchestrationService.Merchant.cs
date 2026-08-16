namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

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

public sealed partial class AnalysisOrchestrationService
{
  /// <inheritdoc/>
  /// <remarks>
  /// <para><b>DAG:</b> NACE 2.1 classification and description generation are independent of each other and are
  /// started before either is awaited, so they execute concurrently.</para>
  /// </remarks>
  public async Task<MerchantAnalysisResult> AnalyzeMerchantAsync(
    AnalysisRun run,
    Merchant merchant,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(run);
    ArgumentNullException.ThrowIfNull(merchant);

    MerchantAnalysisOptions options = run.MerchantOptions
      ?? throw new ArgumentException("The supplied analysis run does not carry merchant analysis options.", nameof(run));

    using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeMerchantAsync));

    var completedCapabilities = new ConcurrentQueue<AnalysisCapability>();

    Task<MerchantClassificationResult?>? classificationTask = options.MerchantClassification
      ? ExecuteBestEffortAsync(
          AnalysisCapability.MerchantClassification,
          () => generativeAnalysisFoundationService.ClassifyMerchantAsync(merchant, run.Id, cancellationToken),
          completedCapabilities)
      : null;

    Task<MerchantDescriptionResult?>? descriptionTask = options.DescriptionGeneration
      ? ExecuteBestEffortAsync(
          AnalysisCapability.DescriptionGeneration,
          () => generativeAnalysisFoundationService.GenerateMerchantDescriptionAsync(merchant, run.Id, cancellationToken),
          completedCapabilities)
      : null;

    MerchantClassificationResult? classificationResult = classificationTask is null
      ? null
      : await classificationTask.ConfigureAwait(false);

    MerchantDescriptionResult? descriptionResult = descriptionTask is null
      ? null
      : await descriptionTask.ConfigureAwait(false);

    return new MerchantAnalysisResult(classificationResult, descriptionResult, completedCapabilities.ToArray());
  }
}
