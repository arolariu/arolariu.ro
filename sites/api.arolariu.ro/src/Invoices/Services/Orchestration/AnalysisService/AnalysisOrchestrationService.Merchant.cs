namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

public sealed partial class AnalysisOrchestrationService
{
  /// <summary>Delegates factual merchant description generation to the analysis foundation.</summary>
  /// <param name="merchant">The merchant evidence to describe.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The validated merchant description.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the merchant or correlation identifier is invalid.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
  public async Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateMerchantDescriptionAsync));
      return await analysisFoundationService
        .GenerateMerchantDescriptionAsync(merchant, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
