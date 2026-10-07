namespace AppHost.Infrastructure.Storage;

using System;
using System.Threading;
using System.Threading.Tasks;
using global::Aspire.Hosting;
using global::Aspire.Hosting.ApplicationModel;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

/// <summary>
/// Configures CORS service-properties on the Aspire-managed Azurite storage emulator
/// so browser-side blob uploads succeed across the origin boundary between
/// <c>https://localhost:3000</c> (website) and <c>http://localhost:10000</c> (blob endpoint),
/// and ensures required blob containers and queues exist through idempotent
/// <c>CreateIfNotExists</c> operations.
///
/// <para>
/// Azurite ships with no default CORS rules, containers, or queues; without this hook every
/// preflight OPTIONS fails with "No 'Access-Control-Allow-Origin' header is present on the
/// requested resource", and the first upload to a missing container 404s with
/// <c>ContainerNotFound</c>. With the named data volume in place (see <c>Program.cs</c>'s
/// Azurite <c>WithDataVolume</c> call), Azurite now persists service-properties and
/// containers across restarts in <c>/data/__azurite_db_blob__.json</c> and
/// <c>__blobstorage__/</c> — but this bootstrap still runs on every AppHost startup as
/// defense in depth: it recovers a fresh-volume state (e.g. after <c>docker volume rm
/// arolariu-azurite-data</c>) without manual intervention, and both operations
/// (CORS replace, <c>CreateIfNotExistsAsync</c>) are idempotent so the cost on a warm
/// volume is negligible.
/// </para>
///
/// <para>
/// In production these storage resources are provisioned by Bicep (see <c>infra/Azure/Bicep</c>).
/// This helper brings the local emulator to the same starting state.
/// </para>
/// </summary>
internal static class AzuriteBootstrap
{
  private const string AzuriteAccountName = "devstoreaccount1";

  // Azurite ships with this well-known dev key baked in — same constant as in
  // exp's config.docker.json and the API's blob-storage health-check setup.
  private const string AzuriteAccountKey =
      "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

  private const int MaxAttempts = 6;

  private const string HealthCheckName = "azurite-bootstrap";

  private static readonly Action<ILogger, Exception?> ProvisioningCompleted = LoggerMessage.Define(
    LogLevel.Information, new EventId(0), "Azurite bootstrap completed (CORS + blob container + queue creation).");
  private static readonly Action<ILogger, Exception?> RecoveryFailed = LoggerMessage.Define(
    LogLevel.Warning, new EventId(0), "Azurite provisioning recovery failed; storage remains unhealthy.");
  private static readonly Action<ILogger, Exception?> ProvisioningFailed = LoggerMessage.Define(
    LogLevel.Warning, new EventId(0), "Azurite bootstrap exhausted retries; storage reports unhealthy.");
  private static readonly Action<ILogger, string, int, int, Exception?> AttemptFailed =
    LoggerMessage.Define<string, int, int>(LogLevel.Debug, new EventId(0),
      "Azurite {Operation} attempt {Attempt} failed; retrying in {Delay}s.");
  private static readonly Action<ILogger, Exception?> CorsApplied = LoggerMessage.Define(
    LogLevel.Information, new EventId(0), "Azurite CORS rules applied (allow-all).");
  private static readonly Action<ILogger, string, Exception?> ContainerAlreadyExists = LoggerMessage.Define<string>(
    LogLevel.Information, new EventId(0), "Azurite container '{Name}' already exists; upgraded public access to Blob.");
  private static readonly Action<ILogger, string, Exception?> ContainerCreated = LoggerMessage.Define<string>(
    LogLevel.Information, new EventId(0), "Azurite container '{Name}' created with public-blob access.");
  private static readonly Action<ILogger, string, Exception?> QueueReady = LoggerMessage.Define<string>(
    LogLevel.Information, new EventId(0), "Azurite queue '{Name}' is ready.");

  /// <summary>
  /// Subscribes a bootstrap handler to <paramref name="storage"/>'s
  /// <see cref="ResourceReadyEvent"/>. The handler applies allow-all CORS rules and
  /// idempotently creates each blob container in <paramref name="blobContainerNames"/> and
  /// queue in <paramref name="queueNames"/>. CORS and resource creation are retried
  /// independently up to 6 times each with linear backoff.
  /// Bootstrap success/failure is surfaced via a custom health check
  /// (<c>azurite-bootstrap</c>) attached to <paramref name="storage"/>, so the dashboard
  /// reports persistent failure and retries failed provisioning on subsequent health polls.
  /// Successful provisioning is not repeated.
  /// </summary>
  /// <param name="builder">The Aspire distributed application builder.</param>
  /// <param name="storage">The Azurite storage resource to configure.</param>
  /// <param name="blobPort">The host port Azurite's blob service is reachable at
  /// (typically <c>10000</c> via <c>WithBlobPort</c>).</param>
  /// <param name="queuePort">The host port Azurite's queue service is reachable at
  /// (typically <c>10001</c> via <c>WithQueuePort</c>).</param>
  /// <param name="blobContainerNames">Blob container names to ensure exist
  /// (<c>CreateIfNotExistsAsync</c>). Pass an empty array if no containers are needed.</param>
  /// <param name="queueNames">Queue names to ensure exist
  /// (<c>CreateIfNotExistsAsync</c>). Pass an empty array if no queues are needed.</param>
  public static IDistributedApplicationBuilder AddAzuriteBootstrap<TResource>(
      this IDistributedApplicationBuilder builder,
      IResourceBuilder<TResource> storage,
      int blobPort,
      int queuePort,
      IReadOnlyList<string> blobContainerNames,
      IReadOnlyList<string> queueNames)
      where TResource : IResource
  {
    ArgumentNullException.ThrowIfNull(builder);
    ArgumentNullException.ThrowIfNull(storage);
    ArgumentNullException.ThrowIfNull(blobContainerNames);
    ArgumentNullException.ThrowIfNull(queueNames);

    string connectionString = CreateConnectionString(blobPort, queuePort);
    var state = new BootstrapState();

    async Task ProvisionAsync(IServiceProvider services, CancellationToken ct)
    {
      ILogger logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("AzuriteBootstrap");
      var blobServiceClient = new BlobServiceClient(connectionString);
      var queueServiceClient = new QueueServiceClient(connectionString);
      await ApplyCorsWithRetryAsync(blobServiceClient, logger, ct).ConfigureAwait(false);
      await EnsureContainersWithRetryAsync(
        blobServiceClient,
        blobContainerNames,
        logger,
        ct).ConfigureAwait(false);
      await EnsureQueuesWithRetryAsync(
        queueServiceClient,
        queueNames,
        logger,
        ct).ConfigureAwait(false);
      ProvisioningCompleted(logger, null);
    }

    builder.Services.AddHealthChecks().Add(new HealthCheckRegistration(
      HealthCheckName,
      services => new BootstrapHealthCheck(state, token => ProvisionAsync(services, token),
        services.GetRequiredService<ILoggerFactory>().CreateLogger("AzuriteBootstrap")),
      HealthStatus.Unhealthy,
      tags: null));
    storage.WithHealthCheck(HealthCheckName);
    builder.Eventing.Subscribe<ResourceReadyEvent>(
      CreateReadyHandler(storage.Resource, state, ProvisionAsync));

    return builder;
  }

  internal sealed class BootstrapHealthCheck(
    BootstrapState state, Func<CancellationToken, Task> provision, ILogger logger) : IHealthCheck
  {
    /// <inheritdoc />
    public async Task<HealthCheckResult> CheckHealthAsync(
      HealthCheckContext context, CancellationToken cancellationToken = default)
    {
      cancellationToken.ThrowIfCancellationRequested();
      // Initial health must permit the readiness event; only recorded failures need recovery.
      if (state.Error is not null)
      {
        try
        {
          await state.RunOnceAsync(provision, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception exception)
        {
          RecoveryFailed(logger, exception);
        }
      }
      return state.Error is Exception error
        ? HealthCheckResult.Unhealthy("Azurite provisioning failed.", error)
        : HealthCheckResult.Healthy();
    }
  }

  internal sealed class BootstrapState
  {
    private int started;
    private Exception? error;
    internal Exception? Error => Volatile.Read(ref error);

    internal async Task RunOnceAsync(Func<CancellationToken, Task> provision, CancellationToken cancellationToken)
    {
      ArgumentNullException.ThrowIfNull(provision);
      cancellationToken.ThrowIfCancellationRequested();
      if (Interlocked.CompareExchange(ref started, 1, 0) != 0) { return; }
      try
      {
        await provision(cancellationToken).ConfigureAwait(false);
        cancellationToken.ThrowIfCancellationRequested();
        Volatile.Write(ref error, null);
      }
      catch (OperationCanceledException)
      {
        Interlocked.Exchange(ref started, 0);
        throw;
      }
      catch (Exception exception)
      {
        Volatile.Write(ref error, exception);
        Interlocked.Exchange(ref started, 0);
        throw;
      }
    }
  }

  internal static Func<ResourceReadyEvent, CancellationToken, Task> CreateReadyHandler(
    IResource target, BootstrapState state, Func<IServiceProvider, CancellationToken, Task> provision)
  {
    ArgumentNullException.ThrowIfNull(target);
    ArgumentNullException.ThrowIfNull(state);
    ArgumentNullException.ThrowIfNull(provision);
    return async (evt, token) =>
    {
      if (!IsResourceOrAncestor(evt.Resource, target)) { return; }
      try
      {
        await state.RunOnceAsync(ct => provision(evt.Services, ct), token).ConfigureAwait(false);
      }
      catch (OperationCanceledException) { throw; }
      catch (Exception exception)
      {
        ILogger logger = evt.Services.GetRequiredService<ILoggerFactory>().CreateLogger("AzuriteBootstrap");
        ProvisioningFailed(logger, exception);
      }
    };
  }

  internal static async Task RetryAsync(
    string operationName, Func<CancellationToken, Task> operation, ILogger? logger,
    Func<TimeSpan, CancellationToken, Task> delay, CancellationToken cancellationToken)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(operationName);
    ArgumentNullException.ThrowIfNull(operation);
    ArgumentNullException.ThrowIfNull(delay);
    for (int attempt = 1; ; attempt++)
    {
      cancellationToken.ThrowIfCancellationRequested();
      try
      {
        await operation(cancellationToken).ConfigureAwait(false);
        cancellationToken.ThrowIfCancellationRequested();
        return;
      }
      catch (Exception exception) when (exception is not OperationCanceledException && attempt < MaxAttempts)
      {
        if (logger is not null) { AttemptFailed(logger, operationName, attempt, attempt, exception); }
        await delay(TimeSpan.FromSeconds(attempt), cancellationToken).ConfigureAwait(false);
      }
    }
  }

  /// <summary>
  /// Creates the local Azurite connection string for blob and queue services.
  /// </summary>
  /// <param name="blobPort">The positive host blob-service port.</param>
  /// <param name="queuePort">The positive host queue-service port.</param>
  /// <returns>The connection string targeting both loopback service endpoints.</returns>
  internal static string CreateConnectionString(int blobPort, int queuePort)
  {
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(blobPort, 0);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(queuePort, 0);

    return
        $"DefaultEndpointsProtocol=http;AccountName={AzuriteAccountName};"
      + $"AccountKey={AzuriteAccountKey};"
      + $"BlobEndpoint=http://localhost:{blobPort}/{AzuriteAccountName};"
      + $"QueueEndpoint=http://localhost:{queuePort}/{AzuriteAccountName};";
  }

  // Match the storage resource itself or any descendant (e.g. the Azurite container
  // child resource that RunAsEmulator spawns).
  private static bool IsResourceOrAncestor(IResource candidate, IResource target)
  {
    var current = candidate;
    while (current is not null)
    {
      if (ReferenceEquals(current, target)) return true;
      current = (current as IResourceWithParent)?.Parent;
    }
    return false;
  }

  private static Task ApplyCorsWithRetryAsync(
      BlobServiceClient client, ILogger? logger, CancellationToken ct)
    => RetryAsync("CORS", async token =>
    {
      var props = (await client.GetPropertiesAsync(token).ConfigureAwait(false)).Value;
      props.Cors.Clear();
      props.Cors.Add(new BlobCorsRule
      {
        AllowedOrigins = "*",
        AllowedMethods = "GET,PUT,POST,DELETE,HEAD,OPTIONS,MERGE",
        AllowedHeaders = "*",
        ExposedHeaders = "*",
        MaxAgeInSeconds = 3600,
      });
      await client.SetPropertiesAsync(props, token).ConfigureAwait(false);
      if (logger is not null) { CorsApplied(logger, null); }
    }, logger, Task.Delay, ct);

  private static async Task EnsureContainersWithRetryAsync(
      BlobServiceClient client,
      IReadOnlyList<string> containerNames,
      ILogger? logger,
      CancellationToken ct)
  {
    if (containerNames.Count == 0) return;

    await RetryAsync("blob container creation", async token =>
    {
      foreach (var name in containerNames)
      {
        var container = client.GetBlobContainerClient(name);
        var created = await container.CreateIfNotExistsAsync(
            publicAccessType: PublicAccessType.Blob,
            cancellationToken: token).ConfigureAwait(false);

        if (created?.Value is null)
        {
          // Container already existed (likely from a prior run with the
          // persistent volume). The create call returns null in that
          // case and does NOT touch the existing access policy, so
          // explicitly upgrade it — first-time runs that predated this
          // bootstrap may have left it at PublicAccessType.None.
          await container.SetAccessPolicyAsync(
              PublicAccessType.Blob,
              cancellationToken: token).ConfigureAwait(false);
          if (logger is not null) { ContainerAlreadyExists(logger, name, null); }
        }
        else
        {
          if (logger is not null) { ContainerCreated(logger, name, null); }
        }
      }
    }, logger, Task.Delay, ct).ConfigureAwait(false);
  }

  private static async Task EnsureQueuesWithRetryAsync(
      QueueServiceClient client,
      IReadOnlyList<string> queueNames,
      ILogger? logger,
      CancellationToken cancellationToken)
  {
    if (queueNames.Count == 0)
    {
      return;
    }

    await RetryAsync("queue creation", async token =>
    {
      foreach (string queueName in queueNames)
      {
        await client
          .GetQueueClient(queueName)
          .CreateIfNotExistsAsync(cancellationToken: token)
          .ConfigureAwait(false);
        if (logger is not null) { QueueReady(logger, queueName, null); }
      }

    }, logger, Task.Delay, cancellationToken).ConfigureAwait(false);
  }
}
