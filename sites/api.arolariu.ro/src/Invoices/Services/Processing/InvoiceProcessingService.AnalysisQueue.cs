namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

/// <summary>
/// Coordinates analysis queue messages and capability execution.
/// </summary>
public sealed partial class InvoiceProcessingService
{
  /// <summary>Ensures the durable analysis queue is available through analysis orchestration.</summary>
  /// <param name="cancellationToken">The token used to cancel queue provisioning.</param>
  /// <returns>A task that completes after queue availability is verified.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when the analysis orchestration dependency cannot provision or verify the queue.
  /// </exception>
  public async Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisQueueAsync));
      await analysisOrchestrationService.EnsureQueueAsync(cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Validates invoice ownership and publishes a resolved durable analysis request.</summary>
  /// <param name="invoiceId">The invoice identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated invoice owner.</param>
  /// <param name="request">The requested profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when the request cannot be converted to valid analysis options.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the target invoice is unavailable to the requester.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when target lookup or queue publication fails.
  /// </exception>
  public async Task<string> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    InvoiceAnalysisRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueInvoiceAnalysisAsync));
      _ = await invoiceOrchestrationService
        .ReadInvoiceObject(invoiceId, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
      InvoiceAnalysisOptions options = request.ToInvoiceAnalysisOptions();
      AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
        invoiceId,
        userIdentifier,
        Guid.CreateVersion7(),
        options,
        ResolveTraceId());

      string messageId = await analysisOrchestrationService
        .EnqueueAnalysisAsync(message, cancellationToken)
        .ConfigureAwait(false);

      InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Invoice);
      logger.LogAnalysisMessageQueued(message.CorrelationId, AnalysisTargetType.Invoice);
      return messageId;
    }).ConfigureAwait(false);

  /// <summary>Validates merchant ownership and publishes a resolved durable analysis request.</summary>
  /// <param name="merchantId">The merchant identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated requester.</param>
  /// <param name="request">The requested profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when the request cannot be converted to valid analysis options.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the target merchant is unavailable or not owned by the requester.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when target lookup or queue publication fails.
  /// </exception>
  public async Task<string> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    MerchantAnalysisRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantAnalysisAsync));
      Merchant merchant = await merchantOrchestrationService
        .ReadMerchantObject(merchantId, parentCompanyId: null, cancellationToken)
        .ConfigureAwait(false);

      if (merchant.CreatedBy != Guid.Empty && merchant.CreatedBy != userIdentifier)
      {
        throw new MerchantForbiddenAccessException(merchantId, userIdentifier);
      }

      MerchantAnalysisOptions options = request.ToMerchantAnalysisOptions();
      AnalysisQueueMessage message = AnalysisQueueMessage.CreateMerchant(
        merchant.id,
        userIdentifier,
        Guid.CreateVersion7(),
        merchant.ParentCompanyId,
        options,
        ResolveTraceId());

      string messageId = await analysisOrchestrationService
        .EnqueueAnalysisAsync(message, cancellationToken)
        .ConfigureAwait(false);

      InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Merchant);
      logger.LogAnalysisMessageQueued(message.CorrelationId, AnalysisTargetType.Merchant);
      return messageId;
    }).ConfigureAwait(false);

  /// <summary>Dequeues at most one visible analysis message using the configured visibility timeout.</summary>
  /// <param name="cancellationToken">The token used to cancel dequeue.</param>
  /// <returns>The provider-neutral receipt, or <see langword="null"/> when no message is visible.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when analysis orchestration cannot complete the dequeue.
  /// </exception>
  public async Task<AnalysisQueueReceipt?> ReceiveNextAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReceiveNextAnalysisAsync));
      return await analysisOrchestrationService
        .ReceiveAnalysisAsync(visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Executes an operation while periodically renewing ownership of its queue message.</summary>
  /// <typeparam name="TResult">The coordinated operation's result type.</typeparam>
  /// <param name="receipt">The currently owned queue receipt.</param>
  /// <param name="operation">The operation invoked with a token linked to visibility ownership.</param>
  /// <param name="cancellationToken">The token used to cancel execution and renewal.</param>
  /// <returns>The operation result when execution and all required renewals succeed.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="receipt"/> or <paramref name="operation"/> is null.</exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when visibility renewal fails and exclusive message ownership can no longer be assumed.
  /// </exception>
  [SuppressMessage(
    "Reliability",
    "CA2025:Ensure tasks using 'IDisposable' instances complete before the instances are disposed",
    Justification = "The visibility-renewal task is always awaited before the cancellation source is disposed.")]
  public async Task<TResult> ExecuteWithVisibilityRenewalAsync<TResult>(
    AnalysisQueueReceipt receipt,
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(receipt);
    ArgumentNullException.ThrowIfNull(operation);

    using var renewalCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    var failure = new VisibilityFailureBox();
    Task renewal = RenewVisibilityUntilCancelledAsync(receipt, failure, renewalCts);
    TResult? result = default;

    try
    {
      result = await operation(renewalCts.Token).ConfigureAwait(false);
    }
    catch (OperationCanceledException) when (failure.Exception is not null)
    {
    }
    finally
    {
      await renewalCts.CancelAsync().ConfigureAwait(false);
      await renewal.ConfigureAwait(false);
    }

    if (failure.Exception is not null)
    {
      throw failure.Exception;
    }

    return result!;
  }

  /// <summary>Deletes a completed or terminally failed analysis message and records its terminal outcome.</summary>
  /// <param name="receipt">The receipt containing the provider message ID and current pop receipt.</param>
  /// <param name="failureReason">The terminal failure reason to record, or <see langword="null"/> for success.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion and terminal logging.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when analysis orchestration cannot delete the queue message.
  /// </exception>
  public async Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    AnalysisFailureReason? failureReason,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAnalysisAsync));
      await analysisOrchestrationService.DeleteAnalysisAsync(receipt, cancellationToken).ConfigureAwait(false);

      if (failureReason.HasValue)
      {
        if (receipt.Message is not null)
        {
          logger.LogAnalysisProcessingRunFailed(
            receipt.Message.CorrelationId,
            failureReason.Value);
        }
        else
        {
          logger.LogMalformedAnalysisMessageDeleted(
            receipt.MessageId,
            receipt.DequeueCount,
            failureReason.Value);
        }
      }
    }).ConfigureAwait(false);

  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any visibility-renewal failure invalidates message ownership and must cancel the coordinated execution scope.")]
  private async Task RenewVisibilityUntilCancelledAsync(
    AnalysisQueueReceipt receipt,
    VisibilityFailureBox failure,
    CancellationTokenSource renewalCts)
  {
    CancellationToken renewalToken = renewalCts.Token;

    while (!renewalToken.IsCancellationRequested)
    {
      try
      {
        await Task.Delay(renewalInterval, renewalToken).ConfigureAwait(false);
        await analysisOrchestrationService
          .RenewAnalysisVisibilityAsync(receipt, visibilityTimeout, renewalToken)
          .ConfigureAwait(false);
      }
      catch (OperationCanceledException) when (renewalToken.IsCancellationRequested)
      {
        return;
      }
      catch (Exception exception)
      {
        failure.Exception = new InvoiceProcessingServiceDependencyException(exception);
        await renewalCts.CancelAsync().ConfigureAwait(false);
        return;
      }
    }
  }

  private static string ResolveTraceId()
  {
    string? ambient = Activity.Current?.Id;

    if (!string.IsNullOrWhiteSpace(ambient))
    {
      return ambient;
    }

    return string.Format(
      CultureInfo.InvariantCulture,
      "00-{0}-{1}-00",
      ActivityTraceId.CreateRandom().ToHexString(),
      ActivitySpanId.CreateRandom().ToHexString());
  }

  private sealed class VisibilityFailureBox
  {
    internal InvoiceProcessingServiceDependencyException? Exception { get; set; }
  }
}
