namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Transports analysis requests through the backend-owned Azure Storage Queue.
/// </summary>
public sealed partial class AzureStorageQueueBroker : IQueueBroker
{
  private readonly QueueClient queueClient;
  private readonly ILogger<IQueueBroker> logger;

  /// <summary>
  /// Initializes a new instance from the backend storage configuration.
  /// </summary>
  /// <param name="optionsManager">The application-options provider containing the storage endpoint.</param>
  /// <param name="loggerFactory">The factory used to create the provider-neutral Broker logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when either dependency is null.</exception>
  public AzureStorageQueueBroker(IOptionsManager optionsManager, ILoggerFactory loggerFactory)
    : this(CreateQueueServiceClient(optionsManager), loggerFactory)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AzureStorageQueueBroker"/> class.
  /// </summary>
  /// <param name="queueServiceClient">The configured Azure Queue service client.</param>
  /// <param name="loggerFactory">The factory used to create the provider-neutral Broker logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when either dependency is null.</exception>
  public AzureStorageQueueBroker(
    QueueServiceClient queueServiceClient,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(queueServiceClient);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    queueClient = queueServiceClient.GetQueueClient(AnalysisQueueName);
    logger = loggerFactory.CreateLogger<IQueueBroker>();
  }

  internal AzureStorageQueueBroker(QueueClient queueClient, ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(queueClient);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.queueClient = queueClient;
    logger = loggerFactory.CreateLogger<IQueueBroker>();
  }

  /// <inheritdoc/>
  public async ValueTask<string> EnqueueMessageAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(message);
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueMessageAsync));
    logger.LogQueueOperationStarted(nameof(EnqueueMessageAsync));

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
  public async ValueTask<AnalysisQueueReceipt?> DequeueMessageAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken)
  {
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
    using var activity = InvoicePackageTracing.StartActivity(nameof(DequeueMessageAsync));
    logger.LogQueueOperationStarted(nameof(DequeueMessageAsync));

    Response<QueueMessage[]> response = await queueClient
      .ReceiveMessagesAsync(1, visibilityTimeout, cancellationToken)
      .ConfigureAwait(false);

    if (response.Value.Length == 0)
    {
      return null;
    }

    QueueMessage message = response.Value[0];
    string rawPayload = message.Body.ToString();
    QueueAnalysisMessage? payload;

    try
    {
      payload = JsonSerializer.Deserialize<QueueAnalysisMessage>(rawPayload);
    }
    catch (Exception exception) when (exception is JsonException or ArgumentException)
    {
      return AnalysisQueueReceipt.CreateMalformed(
        rawPayload,
        message.MessageId,
        message.PopReceipt,
        message.DequeueCount,
        message.NextVisibleOn);
    }

    if (payload is null)
    {
      return AnalysisQueueReceipt.CreateMalformed(
        rawPayload,
        message.MessageId,
        message.PopReceipt,
        message.DequeueCount,
        message.NextVisibleOn);
    }

    return new AnalysisQueueReceipt(
      payload,
      message.MessageId,
      message.PopReceipt,
      message.DequeueCount,
      message.NextVisibleOn);
  }

  /// <inheritdoc/>
  public async ValueTask<AnalysisQueueReceipt> UpdateMessageVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(receipt);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMessageVisibilityAsync));
    logger.LogQueueOperationStarted(nameof(UpdateMessageVisibilityAsync));

    Response<UpdateReceipt> response = await queueClient
      .UpdateMessageAsync(
        receipt.MessageId,
        receipt.PopReceipt,
        receipt.IsMalformed
          ? receipt.RawPayload
          : JsonSerializer.Serialize(receipt.Message),
        visibilityTimeout,
        cancellationToken)
      .ConfigureAwait(false);

    receipt.UpdateVisibility(response.Value.PopReceipt, response.Value.NextVisibleOn);
    return receipt;
  }

  /// <inheritdoc/>
  public async ValueTask DeleteMessageAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(receipt);
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMessageAsync));
    logger.LogQueueOperationStarted(nameof(DeleteMessageAsync));

    await queueClient
      .DeleteMessageAsync(receipt.MessageId, receipt.PopReceipt, cancellationToken)
      .ConfigureAwait(false);
  }

  /// <inheritdoc/>
  public async ValueTask<QueueStatus> GetQueueStatusAsync(CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetQueueStatusAsync));
    logger.LogQueueOperationStarted(nameof(GetQueueStatusAsync));
    Response<bool> existsResponse = await queueClient.ExistsAsync(cancellationToken).ConfigureAwait(false);

    if (!existsResponse.Value)
    {
      return new QueueStatus(Exists: false, ApproximateMessageCount: 0);
    }

    Response<QueueProperties> propertiesResponse = await queueClient
      .GetPropertiesAsync(cancellationToken)
      .ConfigureAwait(false);

    return new QueueStatus(
      Exists: true,
      ApproximateMessageCount: propertiesResponse.Value.ApproximateMessagesCount);
  }
}
