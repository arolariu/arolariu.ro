namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Transports analysis requests through the backend-owned Azure Storage Queue.
/// </summary>
public sealed class AzureStorageQueueBroker : IQueueBroker
{
  private const string AnalysisQueueName = "invoice-analysis";
  private readonly QueueClient queueClient;

  /// <summary>
  /// Initializes a new instance of the <see cref="AzureStorageQueueBroker"/> class.
  /// </summary>
  /// <param name="queueServiceClient">The configured Azure Queue service client.</param>
  public AzureStorageQueueBroker(QueueServiceClient queueServiceClient)
  {
    ArgumentNullException.ThrowIfNull(queueServiceClient);
    queueClient = queueServiceClient.GetQueueClient(AnalysisQueueName);
  }

  internal AzureStorageQueueBroker(QueueClient queueClient) =>
    this.queueClient = queueClient ?? throw new ArgumentNullException(nameof(queueClient));

  /// <inheritdoc/>
  public async ValueTask EnsureAnalysisQueueAsync(CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisQueueAsync));
    await queueClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
  }

  /// <inheritdoc/>
  public async ValueTask<string> EnqueueAnalysisAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(message);
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueAnalysisAsync));

    Response<SendReceipt> response = await queueClient
      .SendMessageAsync(
        JsonSerializer.Serialize(message),
        visibilityTimeout: null,
        timeToLive: null,
        cancellationToken)
      .ConfigureAwait(false);

    return response.Value.MessageId;
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisQueueReceipt?> ReceiveAnalysisAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken)
  {
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReceiveAnalysisAsync));

    Response<QueueMessage[]> response = await queueClient
      .ReceiveMessagesAsync(1, visibilityTimeout, cancellationToken)
      .ConfigureAwait(false);

    if (response.Value.Length == 0)
    {
      return null;
    }

    QueueMessage message = response.Value[0];
    AnalysisQueueMessage payload = JsonSerializer.Deserialize<AnalysisQueueMessage>(message.Body)
      ?? throw new InvalidOperationException("The analysis queue message payload is empty.");

    return new AnalysisQueueReceipt(
      payload,
      message.MessageId,
      message.PopReceipt,
      message.DequeueCount,
      message.NextVisibleOn);
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisQueueReceipt> RenewAnalysisVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(receipt);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
    using var activity = InvoicePackageTracing.StartActivity(nameof(RenewAnalysisVisibilityAsync));

    Response<UpdateReceipt> response = await queueClient
      .UpdateMessageAsync(
        receipt.MessageId,
        receipt.PopReceipt,
        JsonSerializer.Serialize(receipt.Message),
        visibilityTimeout,
        cancellationToken)
      .ConfigureAwait(false);

    return receipt with
    {
      PopReceipt = response.Value.PopReceipt,
      NextVisibleAt = response.Value.NextVisibleOn,
    };
  }

  /// <inheritdoc/>
  public async ValueTask DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(receipt);
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAnalysisAsync));

    await queueClient
      .DeleteMessageAsync(receipt.MessageId, receipt.PopReceipt, cancellationToken)
      .ConfigureAwait(false);
  }
}
