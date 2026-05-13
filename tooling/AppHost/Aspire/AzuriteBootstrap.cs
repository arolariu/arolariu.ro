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
/// <c>https://localhost:3000</c> (website) and <c>http://localhost:10000</c> (blob endpoint),
/// and ensures any required blob containers exist (idempotent <c>CreateIfNotExists</c>).
///
/// <para>
/// Azurite ships with no default CORS rules and no containers; without this hook every
/// preflight OPTIONS fails with "No 'Access-Control-Allow-Origin' header is present on the
/// requested resource", and the first upload to a missing container 404s with
/// <c>ContainerNotFound</c>. CORS service-properties don't survive a container restart in
/// the default ephemeral-volume configuration, so the rules must be re-applied on every
/// AppHost run; the container check is idempotent and cheap.
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

    /// <summary>
    /// Subscribes a bootstrap handler to <paramref name="storage"/>'s
    /// <see cref="ResourceReadyEvent"/>. The handler applies allow-all CORS rules and
    /// idempotently creates each container in <paramref name="containerNames"/>. It
    /// retries up to 6 times with linear backoff because Azurite's blob service typically
    /// needs a couple of seconds after the container reports Ready before service writes
    /// are accepted.
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

        builder.Eventing.Subscribe<ResourceReadyEvent>(async (evt, ct) =>
        {
            if (!ReferenceEquals(evt.Resource, storage.Resource))
                return;

            var logger = evt.Services.GetService<ILoggerFactory>()
                ?.CreateLogger("AzuriteBootstrap");

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

                    // Idempotent — second-and-later runs are no-ops, so this is safe to
                    // call on every AppHost startup even when the data volume persists
                    // containers across restarts. PublicAccessType.Blob enables anonymous
                    // GET on individual blobs (matches prod, where the website renders
                    // thumbnails via raw <img src="…/invoices/…"> without SAS) while
                    // still blocking anonymous container-level listing.
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
                catch (Exception ex) when (attempt < 6)
                {
                    logger?.LogDebug(
                        "Azurite bootstrap attempt {Attempt} failed: {Message}; retrying in {DelaySec}s.",
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
                        "Azurite bootstrap exhausted retries — browser uploads / container access may fail.");
                    return;
                }
            }
        });

        return builder;
    }
}
