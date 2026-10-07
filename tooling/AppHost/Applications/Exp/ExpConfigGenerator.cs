namespace AppHost.Applications.Exp;

using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text;
using System.Runtime.Versioning;
using System.Security.AccessControl;
using System.Security.Principal;

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
  /// to matching top-level keys, and atomically replaces <paramref name="targetPath"/>.
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
    => GenerateAspireConfig(sourcePath, targetPath, endpointOverrides, ReplaceTarget);

  internal static void GenerateAspireConfig(
      string sourcePath,
      string targetPath,
      IReadOnlyDictionary<string, string> endpointOverrides,
      Action<string, string> replaceTarget)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(sourcePath);
    ArgumentException.ThrowIfNullOrWhiteSpace(targetPath);
    ArgumentNullException.ThrowIfNull(endpointOverrides);
    ArgumentNullException.ThrowIfNull(replaceTarget);

    sourcePath = Path.GetFullPath(sourcePath);
    targetPath = Path.GetFullPath(targetPath);
    StringComparison comparison = OperatingSystem.IsWindows()
      ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
    if (string.Equals(ResolveFileSystemPath(sourcePath), ResolveFileSystemPath(targetPath), comparison))
    {
      throw new ArgumentException("Generated configuration must not overwrite its source.", nameof(targetPath));
    }

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
    string temporaryPath = Path.Combine(
      Path.GetDirectoryName(targetPath)
        ?? throw new ArgumentException("Generated configuration requires a parent directory.", nameof(targetPath)),
      $".{Path.GetFileName(targetPath)}.{Guid.NewGuid():N}.tmp");
    Exception? generationError = null;
    try
    {
      WritePrivateTemporaryFile(temporaryPath, targetPath, output);
      replaceTarget(temporaryPath, targetPath);
    }
    catch (Exception exception)
    {
      generationError = exception;
      throw;
    }
    finally
    {
      try
      {
        File.Delete(temporaryPath);
      }
      catch (Exception cleanupError) when (generationError is not null
        && cleanupError is IOException or UnauthorizedAccessException)
      {
        throw new AggregateException(
          "Configuration generation failed and its temporary file could not be removed.",
          generationError, cleanupError);
      }
    }
  }

  private static void ReplaceTarget(string temporaryPath, string targetPath)
  {
    if (File.Exists(targetPath)) { File.Replace(temporaryPath, targetPath, destinationBackupFileName: null); }
    else { File.Move(temporaryPath, targetPath); }
  }

  private static void WritePrivateTemporaryFile(string temporaryPath, string targetPath, string content)
  {
    FileStream stream;
    if (OperatingSystem.IsWindows())
    {
      stream = CreatePrivateWindowsFile(temporaryPath);
    }
    else
    {
      stream = new FileStream(temporaryPath, new FileStreamOptions
      {
        Mode = FileMode.CreateNew,
        Access = FileAccess.Write,
        Share = FileShare.None,
        UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite,
      });
    }
    using (stream)
    using (var writer = new StreamWriter(stream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false)))
    {
      writer.Write(content);
    }
    if (!OperatingSystem.IsWindows() && File.Exists(targetPath))
    {
      File.SetUnixFileMode(temporaryPath, File.GetUnixFileMode(targetPath));
    }
  }

  [SupportedOSPlatform("windows")]
  private static FileStream CreatePrivateWindowsFile(string path)
  {
    using WindowsIdentity identity = WindowsIdentity.GetCurrent();
    SecurityIdentifier owner = identity.User
      ?? throw new InvalidOperationException("A current user SID is required for private configuration.");
    var security = new FileSecurity();
    security.SetOwner(owner);
    security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
    security.AddAccessRule(new FileSystemAccessRule(owner, FileSystemRights.FullControl, AccessControlType.Allow));
    return new FileInfo(path).Create(FileMode.CreateNew, FileSystemRights.FullControl,
      FileShare.None, 4096, FileOptions.None, security);
  }

  private static string ResolveFileSystemPath(string path, int depth = 0)
  {
    if (depth > 64) { throw new IOException("Configuration path contains too many filesystem links."); }
    string fullPath = Path.GetFullPath(path);
    string root = Path.GetPathRoot(fullPath)
      ?? throw new ArgumentException("Configuration path requires a filesystem root.", nameof(path));
    string resolved = root;
    foreach (string component in fullPath[root.Length..].Split(
      [Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar], StringSplitOptions.RemoveEmptyEntries))
    {
      string candidate = Path.Combine(resolved, component);
      FileSystemInfo? target = Directory.Exists(candidate)
        ? new DirectoryInfo(candidate).ResolveLinkTarget(returnFinalTarget: true)
        : File.Exists(candidate) ? new FileInfo(candidate).ResolveLinkTarget(returnFinalTarget: true) : null;
      resolved = target is null ? candidate : ResolveFileSystemPath(target.FullName, depth + 1);
    }
    return resolved;
  }
}
