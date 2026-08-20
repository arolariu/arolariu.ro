namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Validates and classifies access to the Azure Storage Queue analysis boundary.
/// </summary>
public sealed partial class AnalysisQueueFoundationService : IAnalysisQueueFoundationService
{
  private readonly IQueueBroker queueBroker;
  private readonly ILogger<IAnalysisQueueFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisQueueFoundationService"/> class.
  /// </summary>
  /// <param name="queueBroker">The broker that owns Azure Storage Queue operations.</param>
  /// <param name="loggerFactory">The factory used to create the queue foundation logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
  public AnalysisQueueFoundationService(
    IQueueBroker queueBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(queueBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.queueBroker = queueBroker;
    logger = loggerFactory.CreateLogger<IAnalysisQueueFoundationService>();
  }

  /// <inheritdoc/>
  public async Task<string> EnqueueAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueAsync));
      ArgumentNullException.ThrowIfNull(message);
      return await queueBroker.EnqueueMessageAsync(message, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisQueueReceipt?> DequeueAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DequeueAsync));
      ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
      return await queueBroker
        .DequeueMessageAsync(visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisQueueReceipt> RenewVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RenewVisibilityAsync));
      ArgumentNullException.ThrowIfNull(receipt);
      ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
      return await queueBroker
        .UpdateMessageVisibilityAsync(receipt, visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAsync));
      ArgumentNullException.ThrowIfNull(receipt);
      await queueBroker.DeleteMessageAsync(receipt, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);
}
