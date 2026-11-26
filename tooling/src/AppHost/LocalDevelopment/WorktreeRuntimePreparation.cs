namespace AppHost.LocalDevelopment;

using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using AppHost.Applications.Exp;
using AppHost.Applications.Website;
using AppHost.Repository;

/// <summary>Creates runtime files for a validated launch in its protected, empty stage.</summary>
internal static class WorktreeRuntimePreparation
{
  private const int MaximumConfigBytes = 1024 * 1024;

  internal static void Write(
    WorktreeLaunchScope scope, RepositoryLayout layout, X509Certificate2 authority, DateTimeOffset now)
    => Write(scope, layout, authority, now, IsTrustedAuthority);

  internal static void Write(
    WorktreeLaunchScope scope, RepositoryLayout layout, X509Certificate2 authority, DateTimeOffset now,
    Func<X509Certificate2, bool> isTrusted)
  {
    ArgumentNullException.ThrowIfNull(scope);
    ArgumentNullException.ThrowIfNull(layout);
    ArgumentNullException.ThrowIfNull(authority);
    ArgumentNullException.ThrowIfNull(isTrusted);

    WorktreeRuntimeInputs runtime = scope.Runtime;
    string directory = Path.GetDirectoryName(runtime.ExpConfigPath)
      ?? throw new InvalidOperationException("Missing scoped runtime directory.");
    var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
    if (!string.Equals(scope.Root, layout.RootDirectory, comparison) || !IsPlainPath(directory, directory: true)
      || !IsPlainPath(layout.SourceConfigPath, directory: false)
      || new FileInfo(layout.SourceConfigPath).Length > MaximumConfigBytes
      || !authority.HasPrivateKey
      || !authority.Extensions.OfType<X509BasicConstraintsExtension>().Any(extension => extension.CertificateAuthority)
      || !isTrusted(authority))
    {
      throw new InvalidOperationException("The scoped runtime directory, EXP input, or CA could not be verified.");
    }

    string websiteCertificate = runtime.WebsiteCertificatePath
      ?? throw new InvalidOperationException("Missing scoped website certificate path.");
    string[] destinations = [runtime.ExpConfigPath, websiteCertificate, runtime.WebsiteKeyPath,
      runtime.ServiceCertificatePath, runtime.ServiceKeyPath];
    if (destinations.Any(path => File.Exists(path) || Directory.Exists(path) || new FileInfo(path).LinkTarget is not null))
      throw new InvalidOperationException("The scoped runtime files already exist; no file was replaced.");

    string password = runtime.ReadSqlPassword();
    ArgumentException.ThrowIfNullOrWhiteSpace(password);
    IReadOnlyDictionary<string, string> endpoints = ExpResources.CreateScopedEndpointOverrides(password, scope);
    string expConfig = ProjectScopedConfig(layout.SourceConfigPath, endpoints);
    var (website, service) = WebsiteCertificateRenewal.CreateScopedLeaves(authority, scope.ScopeId, now);
    using (website)
    using (service)
    using (RSA websiteKey = website.GetRSAPrivateKey() ?? throw new InvalidOperationException("Missing scoped website key."))
    using (RSA serviceKey = service.GetRSAPrivateKey() ?? throw new InvalidOperationException("Missing scoped service key."))
    {
      var created = new List<string>(destinations.Length);
      try
      {
        WritePrivate(websiteCertificate, website.ExportCertificatePem(), created);
        WritePrivate(runtime.WebsiteKeyPath, websiteKey.ExportPkcs8PrivateKeyPem(), created);
        WritePrivate(runtime.ServiceCertificatePath, service.ExportCertificatePem(), created);
        WritePrivate(runtime.ServiceKeyPath, serviceKey.ExportPkcs8PrivateKeyPem(), created);
        WritePrivate(runtime.ExpConfigPath, expConfig, created);
        if (!VerifyExpConfig(runtime.ExpConfigPath, endpoints))
          throw new InvalidOperationException("The scoped EXP settings did not match the derived endpoints.");
      }
      catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or InvalidOperationException)
      {
        foreach (string path in created) File.Delete(path);
        throw;
      }
    }
  }

  internal static bool VerifyExpConfig(string path, IReadOnlyDictionary<string, string> endpoints)
  {
    try
    {
      if (!IsPlainPath(path, directory: false)) return false;
      var values = ReadConfig(path);
      return endpoints.All(entry => values.TryGetValue(entry.Key, out JsonElement value)
        && value.ValueKind == JsonValueKind.String && value.GetString() == entry.Value);
    }
    catch (Exception exception) when (exception is IOException or JsonException or UnauthorizedAccessException or InvalidOperationException)
    {
      return false;
    }
  }

  private static string ProjectScopedConfig(string path, IReadOnlyDictionary<string, string> endpoints)
  {
    var values = ReadConfig(path);
    foreach (var (key, value) in endpoints)
    {
      if (values.Keys.Any(existing => string.Equals(existing, key, StringComparison.OrdinalIgnoreCase)
        && !string.Equals(existing, key, StringComparison.Ordinal)))
        throw new InvalidOperationException("The scoped EXP configuration contains a noncanonical endpoint key.");
      values[key] = JsonSerializer.SerializeToElement(value);
    }
    return JsonSerializer.Serialize(values);
  }

  private static Dictionary<string, JsonElement> ReadConfig(string path)
  {
    using var source = File.OpenRead(path);
    if (source.Length is <= 0 or > MaximumConfigBytes)
      throw new InvalidOperationException("The scoped EXP configuration size is unsupported.");
    byte[] input = new byte[(int)source.Length];
    try
    {
      source.ReadExactly(input);
      if (source.ReadByte() >= 0) throw new InvalidOperationException("The scoped EXP configuration changed during preparation.");
      using JsonDocument document = JsonDocument.Parse(input.AsMemory(input.AsSpan().StartsWith("\uFEFF"u8) ? 3 : 0));
      if (document.RootElement.ValueKind != JsonValueKind.Object)
        throw new InvalidOperationException("The scoped EXP configuration must be an object.");
      var values = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
      var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      foreach (JsonProperty property in document.RootElement.EnumerateObject())
      {
        if (!names.Add(property.Name))
          throw new InvalidOperationException("The scoped EXP configuration contains duplicate keys.");
        values.Add(property.Name, property.Value.Clone());
      }
      return values;
    }
    catch (JsonException)
    {
      throw new InvalidOperationException("The scoped EXP configuration is invalid JSON.");
    }
    finally
    {
      CryptographicOperations.ZeroMemory(input);
    }
  }

  private static void WritePrivate(string path, string content, List<string> created)
  {
    using FileStream file = ExpConfigGenerator.CreatePrivateFile(path);
    created.Add(path);
    using var writer = new StreamWriter(file, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
    writer.Write(content);
  }

  private static bool IsTrustedAuthority(X509Certificate2 authority)
  {
    using var chain = new X509Chain();
    chain.ChainPolicy.DisableCertificateDownloads = true;
    chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
    return chain.Build(authority);
  }

  private static bool IsPlainPath(string path, bool directory)
  {
    FileSystemInfo item = directory ? new DirectoryInfo(path) : new FileInfo(path);
    if (!item.Exists || (item.Attributes & FileAttributes.ReparsePoint) != 0) return false;
    for (var parent = Directory.GetParent(path); parent is not null; parent = parent.Parent)
      if ((parent.Attributes & FileAttributes.ReparsePoint) != 0) return false;
    return true;
  }
}
