using System.Text.Json;
using System.Text.Json.Nodes;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace AppHost.Aspire;

/// <summary>
/// Rewrites the <c>exp</c> service's <c>config.docker.json</c> in-place with
/// Aspire-resolved endpoint URLs while AppHost is running, restoring the
/// original content on graceful shutdown.
///
/// <para>
/// In selfhost mode, <c>config.docker.json</c> contains Docker-network
/// connection strings (e.g. <c>http://cosmosdb:8081/</c>, <c>Server=mssql,1433</c>)
/// that resolve inside the compose network. In Aspire mode, the API runs as a
/// native process on the host and those Docker hostnames don't resolve — and
/// Aspire publishes the emulator containers on random host ports. So we
/// overwrite the connection-string-bearing keys with Aspire-allocated
/// <c>localhost:&lt;port&gt;</c> endpoints, leaving everything else (Clerk
/// secrets, JWT keys, feature flags) untouched.
/// </para>
///
/// <para>
/// Single-file model: the user's existing <c>config.docker.json</c> serves as
/// both source-of-truth and the file the Python service reads from. The
/// original content is captured into memory at <c>AddExpConfigGenerator</c>
/// registration time AND copied to a sidecar <c>.aspire-bak</c> file (crash
/// recovery). On graceful shutdown the cached original is restored. If the
/// previous run crashed, the next startup detects the <c>.aspire-bak</c> file
/// and restores <c>config.docker.json</c> before reading it.
/// </para>
/// </summary>
internal static class ExpConfigGenerator
{
    /// <summary>
    /// Registers an exp config rewriter that operates on <paramref name="configPath"/>
    /// in-place. Caches the original content at registration time, applies the
    /// configured connection-string overrides once all gating resources are ready,
    /// and restores the cached original on graceful shutdown.
    /// </summary>
    /// <param name="builder">The Aspire distributed application builder.</param>
    /// <param name="configPath">Path to exp's <c>config.docker.json</c> (read at registration, rewritten when ready, restored on shutdown).</param>
    /// <param name="connectionStringFactories">
    /// Map of <c>config-key → factory</c>. The factory is invoked after all tracked
    /// resources are ready and returns the Aspire-mode connection string for that key.
    /// </param>
    /// <param name="waitForResources">
    /// Aspire resources whose readiness gates the config write. Typically the
    /// infra resources whose ports appear in the connection strings.
    /// </param>
    public static IDistributedApplicationBuilder AddExpConfigGenerator(
        this IDistributedApplicationBuilder builder,
        string configPath,
        IReadOnlyDictionary<string, Func<string>> connectionStringFactories,
        IReadOnlyCollection<IResource> waitForResources)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentException.ThrowIfNullOrWhiteSpace(configPath);
        ArgumentNullException.ThrowIfNull(connectionStringFactories);
        ArgumentNullException.ThrowIfNull(waitForResources);

        var backupPath = configPath + ".aspire-bak";

        // Crash recovery: if a backup exists from a previous crashed run, restore
        // the original config first so we read the real source-of-truth content.
        if (File.Exists(backupPath))
        {
            File.Copy(backupPath, configPath, overwrite: true);
            File.Delete(backupPath);
        }

        if (!File.Exists(configPath))
        {
            throw new InvalidOperationException(
                $"exp config file not found at {configPath}. Run "
                + "`cp config.template.json config.docker.json` in sites/exp.arolariu.ro/ first.");
        }

        // Read the original ONCE, synchronously, at registration time — before any
        // resource starts and before any event fires. This guarantees we capture
        // the selfhost-compatible content regardless of event timing.
        var originalContent = File.ReadAllText(configPath);

        // Create the sidecar backup so a crash leaves a recoverable copy.
        File.WriteAllText(backupPath, originalContent);

        var state = new GeneratorState
        {
            ConfigPath = configPath,
            BackupPath = backupPath,
            OriginalContent = originalContent,
            Tracked = waitForResources.ToHashSet(),
        };

        builder.Eventing.Subscribe<ResourceReadyEvent>(async (evt, ct) =>
        {
            if (!state.Tracked.Contains(evt.Resource))
                return;

            bool allReady;
            lock (state.ReadyLock)
            {
                state.Ready.Add(evt.Resource);
                allReady = state.Ready.Count == state.Tracked.Count;
            }

            if (!allReady)
                return;

            await WriteAspireConfigAsync(state, connectionStringFactories, ct).ConfigureAwait(false);
        });

        builder.Services.AddSingleton<IHostedService>(_ => new RestoreOriginalHostedService(state));

        return builder;
    }

    internal static async Task WriteAspireConfigAsync(
        GeneratorState state,
        IReadOnlyDictionary<string, Func<string>> connectionStringFactories,
        CancellationToken ct)
    {
        var config = JsonNode.Parse(state.OriginalContent)?.AsObject()
            ?? throw new InvalidOperationException(
                $"Could not parse {state.ConfigPath} as a JSON object.");

        // Apply each override; only modify keys that exist in the source file
        // (defensive — don't introduce new keys silently)
        foreach (var (key, factory) in connectionStringFactories)
        {
            if (config[key] is null)
                continue;
            config[key] = factory();
        }

        var output = config.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(state.ConfigPath, output, ct).ConfigureAwait(false);
    }

    internal sealed class GeneratorState
    {
        public required string ConfigPath { get; init; }
        public required string BackupPath { get; init; }
        public required string OriginalContent { get; init; }
        public required HashSet<IResource> Tracked { get; init; }
        public HashSet<IResource> Ready { get; } = [];
        public object ReadyLock { get; } = new();
    }

    private sealed class RestoreOriginalHostedService(GeneratorState state) : IHostedService
    {
        public Task StartAsync(CancellationToken _) => Task.CompletedTask;

        public Task StopAsync(CancellationToken _)
        {
            // Restore the cached original content so selfhost mode works next run
            try
            {
                File.WriteAllText(state.ConfigPath, state.OriginalContent);
            }
            catch
            {
                // best-effort — user can restore manually from config.template.json or git
            }

            // Remove the sidecar backup — the next AppHost startup will create a fresh one
            try
            {
                if (File.Exists(state.BackupPath))
                    File.Delete(state.BackupPath);
            }
            catch
            {
                // best-effort
            }

            return Task.CompletedTask;
        }
    }
}
