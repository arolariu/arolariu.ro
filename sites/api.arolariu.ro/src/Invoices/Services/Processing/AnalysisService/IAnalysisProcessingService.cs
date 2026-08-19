namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Defines analysis queueing and capability execution workflows.
/// </summary>
public interface IAnalysisProcessingService
{
  /// <summary>Ensures the backend-owned analysis queue exists.</summary>
  Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken);

  /// <summary>Queues invoice analysis after Management validates the target.</summary>
  Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Queues merchant analysis after Management validates the target.</summary>
  Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Merchant merchant,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Receives at most one visible analysis message.</summary>
  Task<AnalysisQueueReceipt?> ReceiveNextAnalysisAsync(CancellationToken cancellationToken);

  /// <summary>Executes a Management-coordinated scope while renewing queue visibility.</summary>
  Task<TResult> ExecuteWithVisibilityRenewalAsync<TResult>(
    AnalysisQueueReceipt receipt,
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken);

  /// <summary>Executes invoice analysis without persisting the aggregate.</summary>
  Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    AnalysisQueueMessage message,
    Invoice invoice,
    CancellationToken cancellationToken);

  /// <summary>Executes merchant analysis without persisting the aggregate.</summary>
  Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    AnalysisQueueMessage message,
    Merchant merchant,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed analysis message.</summary>
  Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    AnalysisFailureReason? failureReason,
    CancellationToken cancellationToken);
}
