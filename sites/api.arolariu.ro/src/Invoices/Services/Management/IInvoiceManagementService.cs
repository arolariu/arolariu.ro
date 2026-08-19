namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Processing;

/// <summary>
/// Defines the single application-facing entry point consumed by invoice endpoints and the analysis worker.
/// </summary>
public interface IInvoiceManagementService : ICrudProcessingService
{
  /// <summary>
  /// Ensures the durable analysis run store exists before queueing or worker execution begins.
  /// </summary>
  Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken);

  /// <summary>
  /// Validates an invoice target through CRUD processing and then queues a durable invoice analysis run.
  /// </summary>
  Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>
  /// Validates a merchant target through CRUD processing and then queues a durable merchant analysis run.
  /// </summary>
  Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>
  /// Claims, executes, persists, and terminally transitions at most one durable analysis run.
  /// </summary>
  Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken);
}
