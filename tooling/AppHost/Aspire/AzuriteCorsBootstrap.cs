using System;
using System.Threading;
using System.Threading.Tasks;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AppHost.Aspire;

/// <summary>
/// Configures CORS service-properties on the Aspire-managed Azurite storage emulator
/// so browser-side blob uploads succeed across the origin boundary between
/// <c>https://localhost:3000</c> (website) and <c>http://localhost:10000</c> (blob endpoint).
///
/// <para>
/// Azurite ships with no default CORS rules; without this hook every preflight OPTIONS
/// fails with "No 'Access-Control-Allow-Origin' header is present on the requested
/// resource", and the browser blocks the PUT. CORS service-properties don't survive
/// a container restart in the default ephemeral-volume configuration, so the rules
/// must be re-applied on every AppHost run.
/// </para>
/// </summary>
internal static class AzuriteCorsBootstrap
{
    private const string AzuriteAccountName = "devstoreaccount1";

    // Azurite ships with this well-known dev key baked in — same constant as in
    // exp's config.docker.json and the API's blob-storage health-check setup.
    private const string AzuriteAccountKey =
        "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

    /// <summary>
    /// Subscribes a CORS-configuration handler to <paramref name="storage"/>'s
    /// <see cref="ResourceReadyEvent"/>. The handler retries up to 6 times with
    /// linear backoff because Azurite's blob service typically needs a couple of
    /// seconds after the container reports Ready before service-properties writes
    /// are accepted.
    /// </summary>
    /// <param name="builder">The Aspire distributed application builder.</param>
    /// <param name="storage">The Azurite storage resource to configure.</param>
    /// <param name="blobPort">The host port Azurite's blob service is reachable at
    /// (typically <c>10000</c> via <c>WithBlobPort</c>).</param>
    public static IDistributedApplicationBuilder AddAzuriteCorsBootstrap<TResource>(
        this IDistributedApplicationBuilder builder,
        IResourceBuilder<TResource> storage,
        int blobPort)
        where TResource : IResource
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(storage);

        var connStr =
            $"DefaultEndpointsProtocol=http;AccountName={AzuriteAccountName};"
          + $"AccountKey={AzuriteAccountKey};"
          + $"BlobEndpoint=http://localhost:{blobPort}/{AzuriteAccountName};";

        builder.Eventing.Subscribe<ResourceReadyEvent>(async (evt, ct) =>
        {
            if (!ReferenceEquals(evt.Resource, storage.Resource))
                return;

            var logger = evt.Services.GetService<ILoggerFactory>()
                ?.CreateLogger("AzuriteCorsBootstrap");

            var client = new BlobServiceClient(connStr);

            for (int attempt = 1; attempt <= 6; attempt++)
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
                catch (Exception ex) when (attempt < 6)
                {
                    logger?.LogDebug(
                        "Azurite CORS bootstrap attempt {Attempt} failed: {Message}; retrying in {DelaySec}s.",
                        attempt, ex.Message, attempt);
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(attempt), ct).ConfigureAwait(false);
                    }
                    catch (OperationCanceledException)
                    {
                        return;
                    }
                }
                catch (Exception ex)
                {
                    logger?.LogWarning(
                        ex,
                        "Azurite CORS bootstrap exhausted retries — browser uploads from a different origin will be blocked.");
                    return;
                }
            }
        });

        return builder;
    }
}
