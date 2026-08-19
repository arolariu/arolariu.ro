namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class InvoiceProcessingService
{
  private const long MaximumDequeueCount = 5;

  /// <inheritdoc/>
  public async Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(TryExecuteNextAnalysisAsync));
      AnalysisQueueReceipt? receipt = await ReceiveNextAnalysisAsync(cancellationToken).ConfigureAwait(false);

      if (receipt is null)
      {
        return false;
      }

      if (receipt.IsMalformed)
      {
        if (receipt.DequeueCount >= MaximumDequeueCount)
        {
          await DeleteAnalysisAsync(
            receipt,
            AnalysisFailureReason.InvalidStructuredOutput,
            cancellationToken).ConfigureAwait(false);
        }

        return true;
      }

      AnalysisQueueMessage message = receipt.Message
        ?? throw new InvalidOperationException("A valid analysis queue receipt must contain a message.");
      AnalysisFailureReason? failureReason = await ExecuteWithVisibilityRenewalAsync(
        receipt,
        renewalToken => ExecuteAnalysisAttemptAsync(message, renewalToken),
        cancellationToken).ConfigureAwait(false);

      if (!failureReason.HasValue || receipt.DequeueCount >= MaximumDequeueCount)
      {
        await DeleteAnalysisAsync(receipt, failureReason, cancellationToken).ConfigureAwait(false);
      }

      return true;
    }).ConfigureAwait(false);

  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Every queue attempt must be reduced to a bounded failure reason so Azure Queue can apply retry or terminal deletion policy.")]
  private async Task<AnalysisFailureReason?> ExecuteAnalysisAttemptAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    try
    {
      return message.TargetType switch
      {
        AnalysisTargetType.Invoice
          => await ExecuteInvoiceAnalysisAttemptAsync(message, cancellationToken).ConfigureAwait(false),
        AnalysisTargetType.Merchant
          => await ExecuteMerchantAnalysisAttemptAsync(message, cancellationToken).ConfigureAwait(false),
        _ => AnalysisFailureReason.UnsupportedTarget,
      };
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      return ResolveExecutionFailureReason(exception);
    }
  }

  private async Task<AnalysisFailureReason?> ExecuteInvoiceAnalysisAttemptAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    Invoice invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(
        message.TargetId,
        message.TargetPartitionIdentifier ?? message.RequestedBy,
        cancellationToken)
      .ConfigureAwait(false);

    InvoiceAnalysisExecutionResult executionResult = await ExecuteInvoiceAnalysisAsync(
      message,
      invoice,
      cancellationToken).ConfigureAwait(false);

    if (executionResult.Failed)
    {
      return executionResult.FailureReason;
    }

    _ = await PersistInvoiceAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    return null;
  }

  private async Task<AnalysisFailureReason?> ExecuteMerchantAnalysisAttemptAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    Merchant merchant = await merchantOrchestrationService
      .ReadMerchantObject(message.TargetId, message.TargetPartitionIdentifier, cancellationToken)
      .ConfigureAwait(false);

    MerchantAnalysisExecutionResult executionResult = await ExecuteMerchantAnalysisAsync(
      message,
      merchant,
      cancellationToken).ConfigureAwait(false);

    if (executionResult.Failed)
    {
      return executionResult.FailureReason;
    }

    _ = await PersistMerchantAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    return null;
  }

  private static AnalysisFailureReason ResolveExecutionFailureReason(Exception exception)
  {
    if (ContainsExceptionMarker<INotFoundException>(exception))
    {
      return AnalysisFailureReason.DependencyValidation;
    }

    if (ContainsExceptionMarker<ITimeoutException>(exception))
    {
      return AnalysisFailureReason.Dependency;
    }

    if (ContainsExceptionMarker<IDependencyValidationException>(exception))
    {
      return AnalysisFailureReason.DependencyValidation;
    }

    if (ContainsExceptionMarker<IDependencyException>(exception))
    {
      return AnalysisFailureReason.Dependency;
    }

    if (ContainsExceptionMarker<IValidationException>(exception))
    {
      return AnalysisFailureReason.Validation;
    }

    return AnalysisFailureReason.TargetPersistence;
  }

  private static bool ContainsExceptionMarker<TMarker>(Exception exception)
  {
    Exception? current = exception;

    while (current is not null)
    {
      if (current is TMarker)
      {
        return true;
      }

      current = current.InnerException;
    }

    return false;
  }
}
