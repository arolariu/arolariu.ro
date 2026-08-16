namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisProcessingService
{
  /// <summary>
  /// Executes a claimed merchant run end to end: load, analyze, patch, persist, complete.
  /// </summary>
  /// <remarks>
  /// <para><b>Partition handling:</b> The merchant's parent company was captured on the run at queue time, so the
  /// worker performs a partition-scoped point update instead of paying for a cross-partition lookup on every
  /// execution.</para>
  /// </remarks>
  /// <param name="run">The claimed merchant run.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any persistence failure fails the run explicitly rather than completing it and silently discarding analysis output.")]
  private async Task ExecuteMerchantRunAsync(
    AnalysisRun run,
    string leaseOwner,
    CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ExecuteMerchantRunAsync));
    activity?.SetTag("analysis.run_id", run.Id.ToString());
    activity?.SetTag("analysis.target_id", run.TargetId.ToString());

    Merchant merchant = await merchantOrchestrationService
      .ReadMerchantObject(run.TargetId, run.TargetPartitionIdentifier, cancellationToken)
      .ConfigureAwait(false);

    ArgumentNullException.ThrowIfNull(merchant);

    MerchantAnalysisResult result = await analysisOrchestrationService
      .AnalyzeMerchantAsync(run, merchant, cancellationToken)
      .ConfigureAwait(false);

    ArgumentNullException.ThrowIfNull(result);

    var patch = new MerchantAnalysisPatch(result.ClassificationResult, result.DescriptionResult);
    ApplyMerchantPatch(merchant, patch);
    activity?.SetTag("analysis.patch_has_changes", patch.HasChanges);

    try
    {
      await merchantOrchestrationService
        .UpdateMerchantObject(merchant, merchant.id, run.TargetPartitionIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception)
    {
      logger.LogAnalysisProcessingTargetPersistenceFailed(run.Id.ToString(), exception.Message);
      await FailRunAsync(run, leaseOwner, TargetPersistenceFailureCode, cancellationToken).ConfigureAwait(false);
      return;
    }

    await analysisOrchestrationService
      .CompleteRunAsync(run.Id, leaseOwner, result.CompletedCapabilities, DateTimeOffset.UtcNow, cancellationToken)
      .ConfigureAwait(false);
  }

  /// <summary>
  /// Applies every non-null patch section to the merchant entity.
  /// </summary>
  /// <remarks>
  /// <para><b>Section semantics:</b> A <see langword="null"/> section means the capability produced no usable result
  /// and the previously persisted value is left untouched.</para>
  /// </remarks>
  /// <param name="merchant">The entity to mutate.</param>
  /// <param name="patch">The patch produced from the analysis result.</param>
  private static void ApplyMerchantPatch(Merchant merchant, MerchantAnalysisPatch patch)
  {
    if (patch.ClassificationUpdate is not null)
    {
      merchant.Classification = patch.ClassificationUpdate.Classification;
    }

    if (patch.DescriptionUpdate is not null)
    {
      merchant.Description = patch.DescriptionUpdate.Description;
    }
  }
}
