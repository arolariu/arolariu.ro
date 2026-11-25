namespace AppHost;

using AppHost.LocalDevelopment;

/// <summary>Routes startup before constructing a builder or reading/writing the legacy configuration.</summary>
internal static class AppHostStartup
{
  internal static void Run(string[] args, string? descriptorMarker, Action<string[]> runLegacy)
  {
    ArgumentNullException.ThrowIfNull(args);
    ArgumentNullException.ThrowIfNull(runLegacy);
    if (descriptorMarker is not null || args.Any(argument =>
      argument.Equals("--worktree-descriptor", StringComparison.OrdinalIgnoreCase)
      || argument.StartsWith("--worktree-descriptor=", StringComparison.OrdinalIgnoreCase)))
    {
      // Markers never carry launch authority; there is no production verifier or dispatcher.
      throw new InvalidOperationException(WorktreeLaunchScope.LaunchBlocked);
    }
    runLegacy(args);
  }
}
