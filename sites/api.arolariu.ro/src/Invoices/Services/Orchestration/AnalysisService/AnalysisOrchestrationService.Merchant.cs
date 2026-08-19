namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisOrchestrationService
{
  /// <inheritdoc/>
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
