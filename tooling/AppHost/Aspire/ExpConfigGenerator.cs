using System.Text.Json;
using System.Text.Json.Nodes;

namespace AppHost.Aspire;

/// <summary>
/// Generates <c>config.aspire.json</c> for the <c>exp</c> service by copying
/// <c>config.docker.json</c> (the developer's source-of-truth for non-endpoint
/// secrets — Clerk keys, JWT, Resend, etc.) and applying Aspire-mode endpoint
/// overrides on top.
///
/// <para>
/// <b>Why a separate file?</b> Selfhost mode reads <c>config.docker.json</c> with
/// Docker-network connection strings (<c>http://cosmosdb:8081/</c>, <c>Server=mssql,1433</c>);
/// Aspire mode runs the API on the host and needs <c>localhost:&lt;port&gt;</c>.
/// Keeping the two configs side-by-side eliminates the entire crash-recovery /
/// shutdown-restore / external-edit-detection class of bugs — both files are
/// independently authoritative for their mode, neither needs to be reconstructed.
/// <c>config.aspire.json</c> is gitignored (regenerated on every AppHost run).
/// </para>
///
/// <para>
/// The exp service picks up the right file via <c>EXP_LOCAL_CONFIG_PATH</c>
/// (see <c>sites/exp.arolariu.ro/config/loader.py:_resolve_local_config_paths</c>).
/// </para>
/// </summary>
internal static class ExpConfigGenerator
{
    /// <summary>
    /// Reads <paramref name="sourcePath"/>, applies <paramref name="endpointOverrides"/>
    /// to matching top-level keys, and writes the result to <paramref name="targetPath"/>.
    /// Overrides for keys absent in the source are silently skipped (defensive — never
    /// introduce keys that the source file doesn't already define).
    /// </summary>
    /// <param name="sourcePath">Path to <c>config.docker.json</c> (read-only — never mutated).</param>
    /// <param name="targetPath">Path to <c>config.aspire.json</c> (overwritten every call).</param>
    /// <param name="endpointOverrides">Top-level config-key → connection-string overrides.</param>
    public static void GenerateAspireConfig(
        string sourcePath,
        string targetPath,
        IReadOnlyDictionary<string, string> endpointOverrides)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourcePath);
        ArgumentException.ThrowIfNullOrWhiteSpace(targetPath);
        ArgumentNullException.ThrowIfNull(endpointOverrides);

        if (!File.Exists(sourcePath))
        {
            throw new InvalidOperationException(
                $"exp source config not found at {sourcePath}. Run "
                + "`cp config.template.json config.docker.json` in sites/exp.arolariu.ro/ first.");
        }

        var sourceContent = File.ReadAllText(sourcePath);
        var config = JsonNode.Parse(sourceContent)?.AsObject()
            ?? throw new InvalidOperationException(
                $"Could not parse {sourcePath} as a JSON object.");

        foreach (var (key, value) in endpointOverrides)
        {
            if (config[key] is null)
                continue;
            config[key] = value;
        }

        var output = config.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(targetPath, output);
    }
}
