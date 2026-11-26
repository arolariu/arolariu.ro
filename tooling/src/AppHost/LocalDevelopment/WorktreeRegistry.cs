namespace AppHost.LocalDevelopment;

using System.Runtime.Versioning;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text.Json;

/// <summary>Resolves the native registry independently of caller-supplied filesystem paths.</summary>
internal static class WorktreeRegistry
{
  internal const string DirectoryName = "arolariu-native-aspire-v4";

  [SupportedOSPlatform("windows")]
  internal static string? OpenWindows(bool create) =>
    OpenWindows(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), create);

  [SupportedOSPlatform("windows")]
  internal static string? OpenWindows(string parent, bool create)
  {
    if (!Path.IsPathFullyQualified(parent) || !string.Equals(parent, Path.GetFullPath(parent), StringComparison.OrdinalIgnoreCase)
      || new DriveInfo(Path.GetPathRoot(parent)!).DriveType != DriveType.Fixed)
      throw new InvalidOperationException("A canonical fixed local registry route is required.");

    for (var ancestor = new DirectoryInfo(parent); ancestor is not null; ancestor = ancestor.Parent)
      RequireDirectory(ancestor);

    using var identity = WindowsIdentity.GetCurrent();
    SecurityIdentifier owner = identity.User ?? throw new InvalidOperationException("No Windows registry owner.");
    SecurityIdentifier[] principals = [owner, new(WellKnownSidType.LocalSystemSid, null), new(WellKnownSidType.BuiltinAdministratorsSid, null)];
    const InheritanceFlags inheritance = InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit;
    var directory = new DirectoryInfo(Path.Combine(parent, DirectoryName));
    if (!directory.Exists)
    {
      if (directory.LinkTarget is not null || File.Exists(directory.FullName))
        throw new InvalidOperationException("The native registry path is occupied.");
      if (!create) return null;
      var protection = new DirectorySecurity();
      protection.SetOwner(owner);
      protection.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
      foreach (SecurityIdentifier principal in principals)
        protection.AddAccessRule(new FileSystemAccessRule(principal, FileSystemRights.FullControl, inheritance,
          PropagationFlags.None, AccessControlType.Allow));
      directory.Create(protection);
      directory.Refresh();
    }

    RequireDirectory(directory);
    DirectorySecurity acl = directory.GetAccessControl(AccessControlSections.Owner | AccessControlSections.Access);
    var rules = acl.GetAccessRules(includeExplicit: true, includeInherited: true, typeof(SecurityIdentifier))
      .OfType<FileSystemAccessRule>().ToArray();
    if (!acl.AreAccessRulesProtected || !owner.Equals(acl.GetOwner(typeof(SecurityIdentifier)))
      || !rules.Any(rule => owner.Equals(rule.IdentityReference))
      || rules.Any(rule => rule.IsInherited || rule.AccessControlType != AccessControlType.Allow
        || !principals.Any(principal => principal.Equals(rule.IdentityReference))
        || rule.FileSystemRights != FileSystemRights.FullControl
        || rule.InheritanceFlags != inheritance || rule.PropagationFlags != PropagationFlags.None))
      throw new InvalidOperationException("The native registry permissions are not private.");
    return directory.FullName;
  }

  private static void RequireDirectory(DirectoryInfo directory)
  {
    if (!directory.Exists || (directory.Attributes & FileAttributes.ReparsePoint) != 0)
      throw new InvalidOperationException("The native registry route contains a missing or redirected directory.");
  }

  internal static JsonDocument ReadStageRecord(string root, string path)
  {
    if (!Path.IsPathFullyQualified(path) || !Path.IsPathFullyQualified(root))
      throw new InvalidOperationException("The native stage record path is not absolute.");

    var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
    string relative = Path.GetRelativePath(root, path);
    string[] components = relative.Split(Path.DirectorySeparatorChar);
    if (components.Length is < 2 or > 3 || !string.Equals(path, Path.GetFullPath(path), comparison)
      || !components.Take(components.Length - 1).All(component => component.Length == 32
        && component.All(character => character is >= '0' and <= '9' or >= 'a' and <= 'f'))
      || (components.Length == 2 ? components[^1] != "lease.json" : components[^1] != "descriptor.json"))
      throw new InvalidOperationException("The native stage record is not in the anticipated registry route.");

    RequireDirectory(new DirectoryInfo(root));
    string directory = root;
    foreach (string component in components.Take(components.Length - 1))
    {
      directory = Path.Combine(directory, component);
      RequireDirectory(new DirectoryInfo(directory));
    }

    FileInfo record = new(path);
    if (!record.Exists || (record.Attributes & FileAttributes.ReparsePoint) != 0)
      throw new InvalidOperationException("The native stage record is missing or redirected.");
    using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
    if (stream.Length is <= 0 or > 64 * 1024)
      throw new InvalidOperationException("The native stage record has an unsupported size.");
    byte[] bytes = new byte[(int)stream.Length];
    stream.ReadExactly(bytes);
    if (stream.ReadByte() != -1) throw new InvalidOperationException("The native stage record changed during verification.");
    JsonDocument document = JsonDocument.Parse(bytes);
    if (HasUniqueNames(document.RootElement)) return document;
    document.Dispose();
    throw new InvalidOperationException("The native stage record contains repeated members.");
  }

  private static bool HasUniqueNames(JsonElement element)
  {
    if (element.ValueKind == JsonValueKind.Array)
      return element.EnumerateArray().All(HasUniqueNames);
    if (element.ValueKind != JsonValueKind.Object)
      return true;
    var names = new HashSet<string>(StringComparer.Ordinal);
    return element.EnumerateObject().All(property => names.Add(property.Name) && HasUniqueNames(property.Value));
  }
}
