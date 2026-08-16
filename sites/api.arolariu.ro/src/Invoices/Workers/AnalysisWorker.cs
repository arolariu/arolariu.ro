namespace arolariu.Backend.Domain.Invoices.Workers;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

/// <summary>
/// Drains the durable analysis queue by claiming and executing one queued run at a time.
/// </summary>
/// <remarks>
/// <para><b>Layer role (The Standard):</b> This worker is a host adapter, not a service. It resolves
/// <see cref="IAnalysisProcessingService"/> - and nothing else - through a service scope. It never resolves a
/// foundation service, a broker, or a database context, so the layer hierarchy is preserved even though the worker
/// itself is a singleton.</para>
/// <para><b>Scoping:</b> A fresh <see cref="AsyncServiceScope"/> is created for every poll iteration. Scoped
/// dependencies such as the Cosmos-backed brokers are therefore never shared between two runs, and a run that faults
/// cannot poison the next one's object graph.</para>
/// <para><b>Resilience:</b> An unexpected iteration failure is logged and the loop continues. Only host shutdown ends
/// the loop, and it does so without faulting the background task.</para>
/// </remarks>
public sealed class AnalysisWorker : BackgroundService
{
  private static readonly TimeSpan DefaultIdleDelay = TimeSpan.FromSeconds(5);

  private readonly IServiceScopeFactory serviceScopeFactory;
  private readonly ILogger<AnalysisWorker> logger;
  private readonly TimeSpan idleDelay;
  private readonly string workerId;

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisWorker"/> class.
  /// </summary>
  /// <param name="serviceScopeFactory">The factory used to create one service scope per poll iteration.</param>
  /// <param name="logger">The worker logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when any required dependency is null.</exception>
  public AnalysisWorker(IServiceScopeFactory serviceScopeFactory, ILogger<AnalysisWorker> logger)
    : this(serviceScopeFactory, logger, DefaultIdleDelay)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisWorker"/> class with an explicit idle backoff.
  /// </summary>
  /// <remarks>
  /// <para>This overload exists so tests can compress the idle backoff. Production hosting MUST use the two-argument
  /// constructor, which pins the published five-second idle cadence.</para>
  /// </remarks>
  /// <param name="serviceScopeFactory">The factory used to create one service scope per poll iteration.</param>
  /// <param name="logger">The worker logger.</param>
  /// <param name="idleDelay">How long to wait before polling again when the queue was empty.</param>
  /// <exception cref="ArgumentNullException">Thrown when any required dependency is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="idleDelay"/> is negative.</exception>
  public AnalysisWorker(
    IServiceScopeFactory serviceScopeFactory,
    ILogger<AnalysisWorker> logger,
    TimeSpan idleDelay)
  {
    ArgumentNullException.ThrowIfNull(serviceScopeFactory);
    ArgumentNullException.ThrowIfNull(logger);
    ArgumentOutOfRangeException.ThrowIfLessThan(idleDelay, TimeSpan.Zero);

    this.serviceScopeFactory = serviceScopeFactory;
    this.logger = logger;
    this.idleDelay = idleDelay;
    this.workerId = string.Create(
      CultureInfo.InvariantCulture,
      $"{Environment.MachineName}-{Environment.ProcessId}-{Guid.CreateVersion7()}");
  }

  /// <inheritdoc/>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "A single poisoned run must never terminate the hosted worker; the failure is logged and the run's lease expires for retry.")]
  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    logger.LogAnalysisWorkerStarted(workerId);

    // The durable store is provisioned once, before the first poll, so an empty environment does not produce a
    // storm of not-found failures on every iteration.
    await EnsureAnalysisStoreAsync(stoppingToken).ConfigureAwait(false);

    while (!stoppingToken.IsCancellationRequested)
    {
      bool processed = false;

      try
      {
        AsyncServiceScope scope = serviceScopeFactory.CreateAsyncScope();
        await using (scope.ConfigureAwait(false))
        {
          var processing = scope.ServiceProvider.GetRequiredService<IAnalysisProcessingService>();
          processed = await processing.TryExecuteNextRunAsync(workerId, stoppingToken).ConfigureAwait(false);
        }
      }
      catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
      {
        // Host shutdown. Leave the loop without faulting the background task.
        return;
      }
      catch (Exception exception)
      {
        // A single poisoned run must not take the worker down; the run's own lease will expire and be retried.
        logger.LogAnalysisWorkerIterationFailed(exception.Message);
      }

      try
      {
        await Task.Delay(processed ? TimeSpan.Zero : idleDelay, stoppingToken).ConfigureAwait(false);
      }
      catch (OperationCanceledException)
      {
        return;
      }
    }
  }

  /// <summary>
  /// Ensures the durable analysis run store exists before the worker starts polling.
  /// </summary>
  /// <param name="stoppingToken">The host shutdown token.</param>
  /// <returns>Asynchronous task.</returns>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Startup provisioning is best-effort; the real dependency failure is reported per run by the processing layer.")]
  private async Task EnsureAnalysisStoreAsync(CancellationToken stoppingToken)
  {
    try
    {
      AsyncServiceScope scope = serviceScopeFactory.CreateAsyncScope();
      await using (scope.ConfigureAwait(false))
      {
        var processing = scope.ServiceProvider.GetRequiredService<IAnalysisProcessingService>();
        await processing.EnsureAnalysisStoreAsync(stoppingToken).ConfigureAwait(false);
      }
    }
    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
    {
      // Host shutdown during startup provisioning. The polling loop exits immediately on the same token.
      return;
    }
    catch (Exception exception)
    {
      // Provisioning is best-effort at startup: the store may already exist and simply be unreachable for a moment.
      // Polling still proceeds, and each run's own dependency classification reports the real failure.
      logger.LogAnalysisWorkerStoreInitializationFailed(exception.Message);
    }
  }
}
