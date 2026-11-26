namespace AppHost.LocalDevelopment;

using System.Text;
using System.Text.Json;

/// <summary>Fresh launch inputs supplied over the controller's private standard-input pipe.</summary>
internal sealed record WorktreeLaunchRequest(
  string ScopeId, string Root, string CommonGitDirectory, string Branch, string Head, string Engine, string EnginePin,
  string NodeExecutable, Dictionary<string, string> Volumes);

/// <summary>Matches a native launch descriptor against the exact pending checkout and lease.</summary>
internal static class WorktreeStageVerifier
{
  private static readonly string[] SharedFields = ["version", "scopeId", "runId", "root", "branch", "head", "engine", "mode", "ports", "volumes"];

  internal static WorktreeLaunchScope LoadPending(
    string registry, string descriptorPath, string expectedScope, string expectedRoot, string commonGitDirectory,
    string branch, string head, string engine, string enginePin,
    IReadOnlyDictionary<string, string> ownedVolumes, WorktreeRuntimeInputs runtime)
  {
    ArgumentNullException.ThrowIfNull(ownedVolumes);
    ArgumentNullException.ThrowIfNull(runtime);
    try
    {
      using JsonDocument descriptorDocument = WorktreeRegistry.ReadStageRecord(registry, descriptorPath);
      JsonElement descriptor = descriptorDocument.RootElement;
      string scope = descriptor.GetProperty("scopeId").GetString() ?? string.Empty;
      string run = descriptor.GetProperty("runId").GetString() ?? string.Empty;
      string relative = Path.GetRelativePath(registry, descriptorPath);
      if (scope != expectedScope || relative != Path.Combine(scope, run, "descriptor.json"))
        throw InvalidStage();

      using JsonDocument leaseDocument = WorktreeRegistry.ReadStageRecord(registry, Path.Combine(registry, scope, "lease.json"));
      JsonElement lease = leaseDocument.RootElement;
      if (lease.GetProperty("phase").GetString() != "pending" || lease.GetProperty("mode").GetString() != "aspire"
        || !SamePath(lease.GetProperty("commonGitDir").GetString(), commonGitDirectory)
        || lease.GetProperty("branch").GetString() != branch || lease.GetProperty("head").GetString() != head
        || lease.GetProperty("engine").GetString() != engine || lease.GetProperty("engineId").GetString() != enginePin
        || lease.TryGetProperty("processIdentity", out _) || lease.TryGetProperty("resourceOwnership", out _)
        || !SharedFields.All(key => JsonElement.DeepEquals(lease.GetProperty(key), descriptor.GetProperty(key))))
        throw InvalidStage();

      var ports = lease.GetProperty("ports").EnumerateObject()
        .ToDictionary(property => property.Name, property => property.Value.GetInt32(), StringComparer.Ordinal);
      var stage = new VerifiedWorktreeStage(Encoding.UTF8.GetBytes(descriptor.GetRawText()), WorktreeLaunchScope.LaunchVersion,
        registry, expectedRoot, scope, run, branch, head, engine, enginePin, ports, ownedVolumes, runtime);
      return WorktreeLaunchScope.Load(descriptorPath, expectedRoot, (_, _) => stage);
    }
    catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException
      or KeyNotFoundException or FormatException or InvalidOperationException or ArgumentException)
    {
      throw InvalidStage();
    }
  }

  private static bool SamePath(string? value, string expected) =>
    string.Equals(value, expected, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);

  private static InvalidOperationException InvalidStage() =>
    new("The native AppHost descriptor is not authorized by the current pending lease.");
}
