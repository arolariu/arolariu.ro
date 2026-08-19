namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Options;
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
  private const string AzuriteDevelopmentKey =
    "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";
  private readonly QueueClient queueClient;

  /// <summary>
  /// Initializes a new instance from the backend storage configuration.
  /// </summary>
  public AzureStorageQueueBroker(IOptionsManager optionsManager)
    : this(CreateQueueServiceClient(optionsManager))
  {
  }

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
  public async ValueTask CreateQueueIfNotExistsAsync(CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateQueueIfNotExistsAsync));
    await queueClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
  }

  /// <inheritdoc/>
  public async ValueTask<string> EnqueueMessageAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(message);
    using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueMessageAsync));

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

    Response<QueueMessage[]> response = await queueClient
      .ReceiveMessagesAsync(1, visibilityTimeout, cancellationToken)
      .ConfigureAwait(false);

    if (response.Value.Length == 0)
    {
      return null;
    }

    QueueMessage message = response.Value[0];
    string rawPayload = message.Body.ToString();
    AnalysisQueueMessage? payload;

    try
    {
      payload = JsonSerializer.Deserialize<AnalysisQueueMessage>(rawPayload);
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

    await queueClient
      .DeleteMessageAsync(receipt.MessageId, receipt.PopReceipt, cancellationToken)
      .ConfigureAwait(false);
  }

  /// <inheritdoc/>
  public async ValueTask<QueueStatus> GetQueueStatusAsync(CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetQueueStatusAsync));
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

  private static QueueServiceClient CreateQueueServiceClient(IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);
    string blobEndpoint = optionsManager.GetApplicationOptions().StorageAccountEndpoint;
    Uri queueEndpoint = ResolveQueueEndpoint(new Uri(blobEndpoint));

    if (queueEndpoint.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase))
    {
      string connectionString =
        $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey={AzuriteDevelopmentKey};QueueEndpoint={queueEndpoint};";
      return new QueueServiceClient(connectionString);
    }

    return new QueueServiceClient(queueEndpoint, AzureCredentialFactory.CreateCredential());
  }

  internal static Uri ResolveQueueEndpoint(Uri blobEndpoint)
  {
    ArgumentNullException.ThrowIfNull(blobEndpoint);
    var builder = new UriBuilder(blobEndpoint);

    if (builder.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || builder.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
      if (builder.Port == 10000)
      {
        builder.Port = 10001;
      }

      return builder.Uri;
    }

    builder.Host = builder.Host.Replace(".blob.", ".queue.", StringComparison.OrdinalIgnoreCase);
    return builder.Uri;
  }
}
