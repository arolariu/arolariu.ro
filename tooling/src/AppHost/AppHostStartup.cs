namespace AppHost;

using AppHost.LocalDevelopment;

/// <summary>Routes startup before constructing a builder or reading/writing the legacy configuration.</summary>
internal static class AppHostStartup
{
  internal const string RegistryArgument = "--worktree-registry";

  internal static bool TryHandleRegistry(string[] args, string? descriptorMarker, TextWriter output)
  {
    if (!args.Any(argument => argument.Equals(RegistryArgument, StringComparison.OrdinalIgnoreCase)
        || argument.StartsWith($"{RegistryArgument}=", StringComparison.OrdinalIgnoreCase))) return false;
    if (descriptorMarker is not null || args.Length != 2 || args[0] != RegistryArgument
      || args[1] is not ("read" or "create") || !OperatingSystem.IsWindows())
      throw new InvalidOperationException("The native registry command is unavailable.");
    string? path = WorktreeRegistry.OpenWindows(args[1] == "create");
    output.WriteLine(path ?? "absent");
    return true;
  }

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
