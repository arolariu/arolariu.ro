using System.Text.Json;
using System.Text.Json.Nodes;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

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
    /// <returns>
    /// A <see cref="GeneratorState"/> whose <see cref="GeneratorState.ConfigWritten"/>
    /// task completes once the first successful config write finishes. Gate the exp
    /// process start on this to eliminate the exp ↔ config-rewrite race.
    /// </returns>
    public static GeneratorState AddExpConfigGenerator(
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

            // Task 3: check allReady and the one-time write guard atomically so that
            // concurrent or repeated ResourceReadyEvent firings cannot trigger more
            // than one write per AppHost lifecycle.
            bool shouldWrite;
            lock (state.ReadyLock)
            {
                state.Ready.Add(evt.Resource);
                bool allReady = state.Ready.Count == state.Tracked.Count;
                shouldWrite = allReady && !state.HasWritten;
                if (shouldWrite)
                    state.HasWritten = true;
            }

            if (!shouldWrite)
                return;

            await WriteAspireConfigAsync(state, connectionStringFactories, ct).ConfigureAwait(false);
        });

        builder.Services.AddSingleton<IHostedService>(sp =>
            new RestoreOriginalHostedService(
                state,
                sp.GetRequiredService<ILogger<RestoreOriginalHostedService>>()));

        return state;
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

        // Task 4: cache the written content so StopAsync can detect external edits.
        state.LastGeneratedContent = output;

        // Task 5: signal that the config file is ready for exp (uvicorn) to read.
        state.SignalWritten();
    }

    /// <summary>
    /// Mutable state shared between the <c>ResourceReadyEvent</c> handler and the
    /// <see cref="RestoreOriginalHostedService"/>. Also exposes
    /// <see cref="ConfigWritten"/> for callers that need to gate on the rewrite.
    /// </summary>
    internal sealed class GeneratorState
    {
        /// <summary>Absolute path to the exp config file being rewritten.</summary>
        public required string ConfigPath { get; init; }

        /// <summary>Absolute path to the crash-recovery sidecar backup.</summary>
        public required string BackupPath { get; init; }

        /// <summary>Original file content captured at registration time.</summary>
        public required string OriginalContent { get; init; }

        /// <summary>Resources whose readiness gates the config write.</summary>
        public required HashSet<IResource> Tracked { get; init; }

        /// <summary>Resources that have fired <c>ResourceReadyEvent</c> so far.</summary>
        public HashSet<IResource> Ready { get; } = [];

        /// <summary>Lock protecting <see cref="Ready"/>, <see cref="HasWritten"/>, and related state.</summary>
        public object ReadyLock { get; } = new();

        /// <summary>
        /// Task 3: set to <see langword="true"/> once the first write is dispatched,
        /// preventing duplicate writes if <c>ResourceReadyEvent</c> re-fires.
        /// Reset to <see langword="false"/> in <c>StopAsync</c> so a soft restart re-writes.
        /// </summary>
        public bool HasWritten { get; set; }

        /// <summary>
        /// Task 4: content of the last successful file write; <see langword="null"/>
        /// until the first write completes. Used by <c>StopAsync</c> to detect
        /// external edits made while AppHost was running.
        /// </summary>
        public string? LastGeneratedContent { get; set; }

        // Task 5: TCS whose Task completes when the first write succeeds.
        private readonly TaskCompletionSource<bool> _writtenTcs =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        /// <summary>
        /// Completes once the first successful config write has finished.
        /// Gate uvicorn start on this task to eliminate the exp ↔ config-rewrite race
        /// (e.g. via an async <c>WithEnvironment</c> callback on the exp resource).
        /// </summary>
        public Task ConfigWritten => _writtenTcs.Task;

        /// <summary>Signals that the config write has completed successfully.</summary>
        public void SignalWritten() => _writtenTcs.TrySetResult(true);
    }

    private sealed class RestoreOriginalHostedService(
        GeneratorState state,
        ILogger<RestoreOriginalHostedService> logger) : IHostedService
    {
        /// <inheritdoc/>
        public Task StartAsync(CancellationToken _) => Task.CompletedTask;

        /// <inheritdoc/>
        public async Task StopAsync(CancellationToken ct)
        {
            // Task 3: reset the write guard so a soft AppHost restart will re-write.
            lock (state.ReadyLock)
                state.HasWritten = false;

            // Restore the original content so selfhost mode works on the next run.
            // Task 4: if the file was edited outside the generator while AppHost was
            // running, skip the restore to avoid clobbering the user's edits.
            try
            {
                if (state.LastGeneratedContent is not null)
                {
                    var current = await File.ReadAllTextAsync(state.ConfigPath, ct).ConfigureAwait(false);
                    if (current != state.LastGeneratedContent)
                    {
                        logger.LogWarning(
                            "exp config at {Path} was modified outside the generator; skipping restore to avoid clobbering user edits.",
                            state.ConfigPath);
                    }
                    else
                    {
                        await File.WriteAllTextAsync(state.ConfigPath, state.OriginalContent, ct).ConfigureAwait(false);
                    }
                }
                else
                {
                    // Generator never wrote (infra never became ready); the file still
                    // holds the original content — an idempotent restore is safe.
                    File.WriteAllText(state.ConfigPath, state.OriginalContent);
                }
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
        }
    }
}
