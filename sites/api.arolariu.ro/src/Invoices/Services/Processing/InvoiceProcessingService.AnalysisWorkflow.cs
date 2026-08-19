namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

public sealed partial class InvoiceProcessingService
{
  /// <inheritdoc/>
  public async Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    AnalysisQueueMessage message,
    Invoice invoice,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(() => analysisOrchestrationService.ExecuteInvoiceAnalysisAsync(
      message,
      invoice,
      cancellationToken)).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    AnalysisQueueMessage message,
    Merchant merchant,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(() => analysisOrchestrationService.ExecuteMerchantAnalysisAsync(
      message,
      merchant,
      cancellationToken)).ConfigureAwait(false);
}
