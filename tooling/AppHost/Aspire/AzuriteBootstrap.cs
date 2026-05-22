namespace AppHost.Aspire;

using System;
using System.Threading;
using System.Threading.Tasks;
using global::Aspire.Hosting;
using global::Aspire.Hosting.ApplicationModel;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

/// <summary>
/// Configures CORS service-properties on the Aspire-managed Azurite storage emulator
/// so browser-side blob uploads succeed across the origin boundary between
/// <c>https://localhost:3000</c> (website) and <c>http://localhost:10000</c> (blob endpoint),
/// and ensures any required blob containers exist (idempotent <c>CreateIfNotExists</c>).
///
/// <para>
/// Azurite ships with no default CORS rules and no containers; without this hook every
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
/// In production these containers are provisioned by Bicep (see <c>infra/Azure/Bicep</c>).
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

  // Shared bootstrap state surfaced to the dashboard via a custom health check
  // attached to the storage resource. The check is **healthy by default** and only
  // flips to unhealthy on actual bootstrap failure — otherwise we'd deadlock,
  // because Aspire only fires ResourceReadyEvent once every attached health check
  // is Healthy, but the bootstrap handler that would mark this check Healthy only
  // runs *on* ResourceReadyEvent. Optimistic default breaks the cycle; the brief
  // window between "container reachable" and "CORS applied" is harmless because
  // bootstrap completes within seconds and the dashboard turns red on real failure.
  private static volatile string? _bootstrapError;
  private static int _bootstrapStarted; // 0 = not started, 1 = started (Interlocked guard)
  private const string HealthCheckName = "azurite-bootstrap";

  /// <summary>
  /// Subscribes a bootstrap handler to <paramref name="storage"/>'s
  /// <see cref="ResourceReadyEvent"/>. The handler applies allow-all CORS rules and
  /// idempotently creates each container in <paramref name="containerNames"/>. CORS and
  /// container creation are retried independently up to 6 times each with linear backoff.
  /// Bootstrap success/failure is surfaced via a custom health check
  /// (<c>azurite-bootstrap</c>) attached to <paramref name="storage"/>, so the dashboard
  /// turns the storage resource red on persistent failure instead of leaving the user to
  /// debug 404/CORS errors at upload time.
  /// </summary>
  /// <param name="builder">The Aspire distributed application builder.</param>
  /// <param name="storage">The Azurite storage resource to configure.</param>
  /// <param name="blobPort">The host port Azurite's blob service is reachable at
  /// (typically <c>10000</c> via <c>WithBlobPort</c>).</param>
  /// <param name="containerNames">Container names to ensure exist
  /// (<c>CreateIfNotExistsAsync</c>). Pass an empty array if no containers are needed.</param>
  public static IDistributedApplicationBuilder AddAzuriteBootstrap<TResource>(
      this IDistributedApplicationBuilder builder,
      IResourceBuilder<TResource> storage,
      int blobPort,
      params string[] containerNames)
      where TResource : IResource
  {
    ArgumentNullException.ThrowIfNull(builder);
    ArgumentNullException.ThrowIfNull(storage);
    ArgumentNullException.ThrowIfNull(containerNames);

    var connStr =
        $"DefaultEndpointsProtocol=http;AccountName={AzuriteAccountName};"
      + $"AccountKey={AzuriteAccountKey};"
      + $"BlobEndpoint=http://localhost:{blobPort}/{AzuriteAccountName};";

    builder.Services.AddHealthChecks().AddCheck(HealthCheckName, () =>
        _bootstrapError is null
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy(_bootstrapError));
    storage.WithHealthCheck(HealthCheckName);

    builder.Eventing.Subscribe<ResourceReadyEvent>(async (evt, ct) =>
    {
      // ResourceReadyEvent fires on the inner Azurite *container* resource that
      // RunAsEmulator spawns (named "storage-<random>"), not on the parent
      // AzureStorageResource. Walk the parent chain so we match either.
      if (!IsResourceOrAncestor(evt.Resource, storage.Resource))
        return;

      // Guard against multiple ready events (one per endpoint, restarts, etc.).
      if (Interlocked.CompareExchange(ref _bootstrapStarted, 1, 0) != 0)
        return;

      var logger = evt.Services.GetService<ILoggerFactory>()
              ?.CreateLogger("AzuriteBootstrap");

      var client = new BlobServiceClient(connStr);

      try
      {
        await ApplyCorsWithRetryAsync(client, logger, ct).ConfigureAwait(false);
        await EnsureContainersWithRetryAsync(client, containerNames, logger, ct).ConfigureAwait(false);
        _bootstrapError = null;
        logger?.LogInformation("Azurite bootstrap completed (CORS + container creation).");
      }
      catch (OperationCanceledException)
      {
        // Shutdown — leave health check unhealthy; nothing actionable.
        Interlocked.Exchange(ref _bootstrapStarted, 0);
      }
      catch (Exception ex)
      {
        _bootstrapError = ex.Message;
        Interlocked.Exchange(ref _bootstrapStarted, 0); // allow retry on next ready
        logger?.LogWarning(
                ex,
                "Azurite bootstrap exhausted retries — storage resource will report unhealthy in the dashboard.");
      }
    });

    return builder;
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

  private static async Task ApplyCorsWithRetryAsync(
      BlobServiceClient client, ILogger? logger, CancellationToken ct)
  {
    for (int attempt = 1; attempt <= MaxAttempts; attempt++)
    {
      try
      {
        var props = (await client.GetPropertiesAsync(ct).ConfigureAwait(false)).Value;
        props.Cors.Clear();
        props.Cors.Add(new BlobCorsRule
        {
          AllowedOrigins = "*",
          AllowedMethods = "GET,PUT,POST,DELETE,HEAD,OPTIONS,MERGE",
          AllowedHeaders = "*",
          ExposedHeaders = "*",
          MaxAgeInSeconds = 3600,
        });
        await client.SetPropertiesAsync(props, ct).ConfigureAwait(false);
        logger?.LogInformation(
            "Azurite CORS rules applied (allow-all) on attempt {Attempt}.", attempt);
        return;
      }
      catch (Exception ex) when (attempt < MaxAttempts)
      {
        logger?.LogDebug(
            "Azurite CORS attempt {Attempt} failed: {Message}; retrying in {DelaySec}s.",
            attempt, ex.Message, attempt);
        await Task.Delay(TimeSpan.FromSeconds(attempt), ct).ConfigureAwait(false);
      }
    }
    // Final attempt (no catch) — let the exception propagate so the bootstrap
    // handler marks the health check unhealthy with the real error.
    throw new InvalidOperationException(
        $"Azurite CORS bootstrap failed after {MaxAttempts} attempts.");
  }

  private static async Task EnsureContainersWithRetryAsync(
      BlobServiceClient client,
      string[] containerNames,
      ILogger? logger,
      CancellationToken ct)
  {
    if (containerNames.Length == 0) return;

    for (int attempt = 1; attempt <= MaxAttempts; attempt++)
    {
      try
      {
        foreach (var name in containerNames)
        {
          var container = client.GetBlobContainerClient(name);
          var created = await container.CreateIfNotExistsAsync(
              publicAccessType: PublicAccessType.Blob,
              cancellationToken: ct).ConfigureAwait(false);

          if (created?.Value is null)
          {
            // Container already existed (likely from a prior run with the
            // persistent volume). The create call returns null in that
            // case and does NOT touch the existing access policy, so
            // explicitly upgrade it — first-time runs that predated this
            // bootstrap may have left it at PublicAccessType.None.
            await container.SetAccessPolicyAsync(
                PublicAccessType.Blob,
                cancellationToken: ct).ConfigureAwait(false);
            logger?.LogInformation(
                "Azurite container '{Name}' already exists; upgraded public access to Blob.", name);
          }
          else
          {
            logger?.LogInformation(
                "Azurite container '{Name}' created with public-blob access.", name);
          }
        }
        return;
      }
      catch (Exception ex) when (attempt < MaxAttempts)
      {
        logger?.LogDebug(
            "Azurite container creation attempt {Attempt} failed: {Message}; retrying in {DelaySec}s.",
            attempt, ex.Message, attempt);
        await Task.Delay(TimeSpan.FromSeconds(attempt), ct).ConfigureAwait(false);
      }
    }
    throw new InvalidOperationException(
        $"Azurite container bootstrap failed after {MaxAttempts} attempts.");
  }
}
