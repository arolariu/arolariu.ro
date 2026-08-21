namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Defines queue lifecycle, aggregate analysis, and manual classification coordination.
/// </summary>
public interface IAnalysisOrchestrationService
{
  /// <summary>Analyzes the selected invoice capabilities without persisting the aggregate.</summary>
  /// <param name="invoice">The invoice aggregate to enrich in memory.</param>
  /// <param name="options">The selected invoice capability set.</param>
  /// <param name="correlationId">The durable analysis correlation identifier.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The analyzed aggregate and failed or dependency-blocked options, if any.</returns>
  Task<(Invoice Invoice, InvoiceAnalysisOptions? FailedOptions)> AnalyzeInvoiceAsync(
    Invoice invoice,
    InvoiceAnalysisOptions options,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Analyzes the selected merchant capabilities without persisting the entity.</summary>
  /// <param name="merchant">The merchant entity to enrich in memory.</param>
  /// <param name="options">The selected merchant capability set.</param>
  /// <param name="correlationId">The durable analysis correlation identifier.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The analyzed entity and failed options, if any.</returns>
  Task<(Merchant Merchant, MerchantAnalysisOptions? FailedOptions)> AnalyzeMerchantAsync(
    Merchant merchant,
    MerchantAnalysisOptions options,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Canonically resolves one optional manual classification selection.</summary>
  /// <param name="classificationCode">The optional code-only classification request.</param>
  /// <param name="expectedSystem">The taxonomy system required by the target field.</param>
  /// <param name="cancellationToken">The token used to cancel taxonomy resolution.</param>
  /// <returns>The canonical taxonomy snapshot, or <see langword="null"/> when no selection was supplied.</returns>
  Task<StandardClassification?> ResolveManualClassificationAsync(
    string? classificationCode,
    ClassificationSystem expectedSystem,
    CancellationToken cancellationToken);

  /// <summary>Enqueues one analysis message and returns Azure Queue's message identifier.</summary>
  /// <param name="message">The provider-neutral durable analysis request.</param>
  /// <param name="cancellationToken">The token used to cancel publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  Task<string> EnqueueAnalysisAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken);

  /// <summary>Receives at most one visible analysis message.</summary>
  /// <param name="visibilityTimeout">The positive interval for which a dequeued message is hidden.</param>
  /// <param name="cancellationToken">The token used to cancel dequeue.</param>
  /// <returns>The receipt, or <see langword="null"/> when no message is visible.</returns>
  Task<AnalysisQueueReceipt?> ReceiveAnalysisAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Renews one received analysis message's visibility timeout.</summary>
  /// <param name="receipt">The receipt containing the current provider message ID and pop receipt.</param>
  /// <param name="visibilityTimeout">The positive replacement visibility interval.</param>
  /// <param name="cancellationToken">The token used to cancel renewal.</param>
  /// <returns>The receipt after provider state has been updated.</returns>
  Task<AnalysisQueueReceipt> RenewAnalysisVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed analysis message.</summary>
  /// <param name="receipt">The receipt containing the provider message ID and current pop receipt.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);
}
