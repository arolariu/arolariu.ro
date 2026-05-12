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
/// both the source-of-truth (cached at AppHost startup, before any
/// modification) and the target the Python service reads from. On graceful
/// shutdown the cached original content is restored, so the file is
/// selfhost-compatible again for the next <c>dev:selfhost</c> run.
/// </para>
///
/// <para>
/// Hard-kill recovery: if AppHost crashes without restoring, the file stays in
/// Aspire-mode state. The next AppHost startup detects this is unsafe (no
/// cached original) and writes fresh Aspire-mode content; the user can
/// restore for selfhost from <c>config.template.json</c> or git.
/// </para>
/// </summary>
internal static class ExpConfigGenerator
{
    /// <summary>
    /// Registers an exp config rewriter that operates on <paramref name="configPath"/>
    /// in-place. Caches the original content at AppHost startup, applies the
    /// configured connection-string overrides once all gating resources are ready,
    /// and restores the cached original on graceful shutdown.
    /// </summary>
    /// <param name="builder">The Aspire distributed application builder.</param>
    /// <param name="configPath">Path to exp's <c>config.docker.json</c> (read at startup, rewritten when ready, restored on shutdown).</param>
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

        var state = new GeneratorState
        {
            ConfigPath = configPath,
            Tracked = waitForResources.ToHashSet(),
        };

        // Cache the ORIGINAL content at startup, before any resource has booted
        // (so before our generator writes anything to the file).
        builder.Eventing.Subscribe<AfterResourcesCreatedEvent>(async (_, ct) =>
        {
            if (!File.Exists(state.ConfigPath))
            {
                throw new InvalidOperationException(
                    $"exp config file not found at {state.ConfigPath}. Run "
                    + "`cp config.template.json config.docker.json` in sites/exp.arolariu.ro/ first.");
            }
            state.OriginalContent = await File.ReadAllTextAsync(state.ConfigPath, ct).ConfigureAwait(false);
        });

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

        // Graceful-shutdown: restore the cached original so selfhost mode works again
        builder.Services.AddSingleton<IHostedService>(_ => new RestoreOriginalHostedService(state));

        return builder;
    }

    internal static async Task WriteAspireConfigAsync(
        GeneratorState state,
        IReadOnlyDictionary<string, Func<string>> connectionStringFactories,
        CancellationToken ct)
    {
        if (state.OriginalContent is null)
        {
            throw new InvalidOperationException(
                "Original config content not cached; AfterResourcesCreatedEvent didn't fire.");
        }

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
        public required HashSet<IResource> Tracked { get; init; }
        public HashSet<IResource> Ready { get; } = [];
        public object ReadyLock { get; } = new();
        public string? OriginalContent { get; set; }
    }

    private sealed class RestoreOriginalHostedService(GeneratorState state) : IHostedService
    {
        public Task StartAsync(CancellationToken _) => Task.CompletedTask;

        public Task StopAsync(CancellationToken _)
        {
            // Restore the cached original content so selfhost mode works next time
            if (state.OriginalContent is not null)
            {
                try
                {
                    File.WriteAllText(state.ConfigPath, state.OriginalContent);
                }
                catch
                {
                    // best-effort — user can restore manually from config.template.json or git
                }
            }
            return Task.CompletedTask;
        }
    }
}
