namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Defines the analysis-specific processing workflow used by the invoice management service.
/// </summary>
public interface IAnalysisProcessingService
{
  /// <summary>
  /// Idempotently ensures the durable analysis run store exists and is correctly configured.
  /// </summary>
  Task EnsureAnalysisStoreAsync(CancellationToken cancellationToken);

  /// <summary>
  /// Accepts a durable invoice analysis run after the caller has already validated the target invoice.
  /// </summary>
  Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>
  /// Accepts a durable merchant analysis run after the caller has already validated the target merchant.
  /// </summary>
  Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Merchant merchant,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>
  /// Claims at most one durable analysis run for later target-specific execution.
  /// </summary>
  Task<AnalysisRun?> ClaimNextRunAsync(string leaseOwner, CancellationToken cancellationToken);

  /// <summary>
  /// Executes a Management-coordinated run scope while renewing the durable lease until the callback returns.
  /// </summary>
  Task<TResult> ExecuteWithLeaseHeartbeatAsync<TResult>(
    AnalysisRun run,
    string leaseOwner,
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken)
    where TResult : struct;

  /// <summary>
  /// Executes the non-persistence portion of an invoice analysis run while renewing its lease.
  /// </summary>
  Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceRunAsync(
    AnalysisRun run,
    Invoice invoice,
    string leaseOwner,
    CancellationToken cancellationToken);

  /// <summary>
  /// Executes the non-persistence portion of a merchant analysis run while renewing its lease.
  /// </summary>
  Task<MerchantAnalysisExecutionResult> ExecuteMerchantRunAsync(
    AnalysisRun run,
    Merchant merchant,
    string leaseOwner,
    CancellationToken cancellationToken);

  /// <summary>
  /// Completes a durable analysis run after its immutable execution result has been persisted.
  /// </summary>
  Task CompleteRunExecutionAsync(
    AnalysisExecutionResult executionResult,
    string leaseOwner,
    CancellationToken cancellationToken);

  /// <summary>
  /// Fails a durable analysis run after a bounded execution or persistence failure.
  /// </summary>
  Task FailRunExecutionAsync(
    AnalysisExecutionResult executionResult,
    string leaseOwner,
    CancellationToken cancellationToken);
}
