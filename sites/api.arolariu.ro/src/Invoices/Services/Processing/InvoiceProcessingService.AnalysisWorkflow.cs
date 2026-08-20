namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using DDD = arolariu.Backend.Domain.Invoices.DDD;

public sealed partial class InvoiceProcessingService
{
  /// <summary>Executes invoice capabilities through analysis orchestration without persistence.</summary>
  /// <param name="message">The durable invoice request containing resolved options.</param>
  /// <param name="invoice">The invoice snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable invoice analysis execution result.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when analysis orchestration rejects the request input.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when an analysis dependency fails.
  /// </exception>
  public async Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    AnalysisQueueMessage message,
    Invoice invoice,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(() => analysisOrchestrationService.ExecuteInvoiceAnalysisAsync(
      message,
      invoice,
      cancellationToken)).ConfigureAwait(false);

  /// <summary>Executes merchant capabilities through analysis orchestration without persistence.</summary>
  /// <param name="message">The durable merchant request containing resolved options.</param>
  /// <param name="merchant">The merchant snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable merchant analysis execution result.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when analysis orchestration rejects the request input.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when an analysis dependency fails.
  /// </exception>
  public async Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    AnalysisQueueMessage message,
    Merchant merchant,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(() => analysisOrchestrationService.ExecuteMerchantAnalysisAsync(
      message,
      merchant,
      cancellationToken)).ConfigureAwait(false);
}
