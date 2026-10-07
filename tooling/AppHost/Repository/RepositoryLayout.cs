namespace AppHost.Repository;

/// <summary>Describes host-owned repository paths without depending on the caller's directory.</summary>
internal sealed record RepositoryLayout(
  string RootDirectory,
  string ExpDirectory,
  string SourceConfigPath,
  string GeneratedConfigPath,
  string WebsiteDirectory,
  string CvDirectory,
  string DocsDirectory,
  string StatusDirectory)
{
  internal static RepositoryLayout Resolve(string appHostDirectory)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(appHostDirectory);
    string root = Path.GetFullPath(Path.Combine(appHostDirectory, "..", ".."));
    string sites = Path.Combine(root, "sites");
    string exp = Path.Combine(sites, "exp.arolariu.ro");
    return new(root, exp,
      Path.Combine(exp, "config.docker.json"),
      Path.Combine(exp, "config.aspire.json"),
      Path.Combine(sites, "arolariu.ro"),
      Path.Combine(sites, "cv.arolariu.ro"),
      Path.Combine(sites, "docs.arolariu.ro"),
      Path.Combine(sites, "status.arolariu.ro"));
  }
}
