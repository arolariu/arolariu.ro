namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;

using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;

using Azure;

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
  public async Task EnsureQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureQueueAsync));
      await queueBroker.EnsureAnalysisQueueAsync(cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<string> EnqueueAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnqueueAsync));
      ArgumentNullException.ThrowIfNull(message);
      return await queueBroker.EnqueueAnalysisAsync(message, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisQueueReceipt?> ReceiveAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReceiveAsync));
      ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);
      return await queueBroker
        .ReceiveAnalysisAsync(visibilityTimeout, cancellationToken)
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
        .RenewAnalysisVisibilityAsync(receipt, visibilityTimeout, cancellationToken)
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
      await queueBroker.DeleteAnalysisAsync(receipt, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  private async Task TryCatchAsync(Func<Task> operation)
  {
    try
    {
      await operation().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private async Task<TResult> TryCatchAsync<TResult>(Func<Task<TResult>> operation)
  {
    try
    {
      return await operation().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    ArgumentException
      => LogValidation(exception),

    JsonException
      or InvalidOperationException
      => LogDependencyValidation(exception),

    RequestFailedException
      or HttpRequestException
      or TimeoutException
      => LogDependency(exception),

    _ => LogService(exception),
  };

  private AnalysisFoundationValidationException LogValidation(Exception exception)
  {
    LogAnalysisQueueFailure(logger, "validation");
    return new AnalysisFoundationValidationException(exception);
  }

  private AnalysisFoundationDependencyValidationException LogDependencyValidation(Exception exception)
  {
    LogAnalysisQueueFailure(logger, "dependency_validation");
    return new AnalysisFoundationDependencyValidationException(exception);
  }

  private AnalysisFoundationDependencyException LogDependency(Exception exception)
  {
    LogAnalysisQueueFailure(logger, "dependency");
    return new AnalysisFoundationDependencyException(exception);
  }

  private AnalysisFoundationServiceException LogService(Exception exception)
  {
    LogAnalysisQueueFailure(logger, "service");
    return new AnalysisFoundationServiceException(exception);
  }

  [LoggerMessage(
    EventId = 300_340,
    Level = LogLevel.Error,
    Message = "The analysis queue Foundation classified a {failureType} failure.")]
  private static partial void LogAnalysisQueueFailure(ILogger logger, string failureType);
}
