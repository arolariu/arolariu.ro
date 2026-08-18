namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Defines the processing-layer entry points for the asynchronous analysis pipeline: request-time run acceptance and
/// worker-time run execution.
/// </summary>
/// <remarks>
/// <para><b>Layer role (The Standard):</b> An implementation of this contract depends on exactly three orchestration
/// services - invoice, merchant, and analysis (the Florance Pattern). It never resolves a foundation service or a
/// broker, and it never performs OCR or generative work itself.</para>
/// <para><b>Request path:</b> <see cref="QueueInvoiceAnalysisAsync"/> and <see cref="QueueMerchantAnalysisAsync"/>
/// validate that the target exists, resolve the effective capability selection from the caller's profile and
/// overrides, persist a durable run, and return immediately. No analysis work happens on the request thread.</para>
/// <para><b>Worker path:</b> <see cref="TryExecuteNextRunAsync"/> claims a single durable run, keeps its lease alive
/// while capabilities execute, applies the resulting patch to the target aggregate, persists the target, and
/// completes or fails the run.</para>
/// <para><b>Cancellation:</b> Every method propagates <see cref="OperationCanceledException"/> unchanged.</para>
/// </remarks>
public interface IAnalysisProcessingService
{
  /// <summary>
  /// Idempotently ensures the durable analysis run store exists and is correctly configured.
  /// </summary>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  Task EnsureAnalysisStoreAsync(CancellationToken cancellationToken);

  /// <summary>
  /// Validates the invoice target and accepts a durable invoice analysis run into the queue.
  /// </summary>
  /// <param name="invoiceId">The identifier of the invoice to analyze.</param>
  /// <param name="userIdentifier">The authenticated caller identifier supplied by the exposer.</param>
  /// <param name="request">The caller-supplied profile and capability overrides.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The accepted-run projection of the persisted durable run.</returns>
  Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>
  /// Validates the merchant target and accepts a durable merchant analysis run into the queue.
  /// </summary>
  /// <param name="merchantId">The identifier of the merchant to analyze.</param>
  /// <param name="userIdentifier">The authenticated caller identifier supplied by the exposer.</param>
  /// <param name="request">The caller-supplied profile and capability overrides.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The accepted-run projection of the persisted durable run.</returns>
  Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>
  /// Claims and executes at most one queued analysis run.
  /// </summary>
  /// <param name="leaseOwner">The stable identifier of the worker claiming the run.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns><see langword="true"/> when a run was claimed and executed; otherwise, <see langword="false"/>.</returns>
  Task<bool> TryExecuteNextRunAsync(
    string leaseOwner,
    CancellationToken cancellationToken);
}
