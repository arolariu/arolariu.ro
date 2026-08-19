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

    receipt.UpdateVisibility(response.Value.PopReceipt, response.Value.NextVisibleOn);
    return receipt;
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
