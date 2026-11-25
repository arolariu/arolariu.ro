namespace AppHost.Applications.Website;

using System.Globalization;
using AppHost.LocalDevelopment;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.JavaScript;

#pragma warning disable ASPIREJAVASCRIPT001

/// <summary>Registers the website's native HTTPS, readiness, and certificate-renewal behavior.</summary>
internal static class WebsiteResources
{
  internal static IResourceBuilder<NextJsAppResource> AddWebsite(
    this IDistributedApplicationBuilder builder, RepositoryLayout layout) =>
    builder.AddNextJsApp("website", layout.WebsiteDirectory)
      // Upgrade the integration's PORT-bound endpoint rather than adding a second, dead HTTP link.
      .WithEndpoint("http", endpoint =>
      {
        endpoint.UriScheme = "https";
        endpoint.Port = Constants.WebsitePort;
      })
      // Next replaces Aspire's CA bundle with mkcert's; Node must also trust the OS's API development certificate.
      .WithEnvironment("NODE_USE_SYSTEM_CA", "1")
      .WithIconName("Globe")
      .WithHttpHealthCheck("/api/health/")
      .WithDevelopmentCertificateRenewal(
        Path.Combine(layout.WebsiteDirectory, "certificates"), WebsiteCertificateRenewal.ResolveAuthorityDirectory(),
        TimeProvider.System, WebsiteCertificateRenewal.IsAuthorityTrusted);

  internal static IResourceBuilder<ExecutableResource> AddScopedWebsite(
    this IDistributedApplicationBuilder builder, RepositoryLayout layout, WorktreeLaunchScope scope)
  {
    var website = builder.AddExecutable("website", scope.Runtime.NodeExecutable, layout.WebsiteDirectory,
        Path.Combine(layout.RootDirectory, "node_modules", "next", "dist", "bin", "next"),
        "dev", "--hostname", WorktreeLaunchScope.LoopbackHost,
        "--port", scope.Port("website").ToString(CultureInfo.InvariantCulture),
        "--experimental-https", "--experimental-https-cert", scope.Runtime.WebsiteCertificatePath!,
        "--experimental-https-key", scope.Runtime.WebsiteKeyPath)
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("AZURE_CLIENT_ID", "")
      .WithEnvironment("SITE_URL", scope.WebsiteOrigin)
      .WithEnvironment("EXP_PROXY_URL", scope.Url("exp", "http"))
      .WithEnvironment("API_URL", scope.Url("api", "https"))
      .WithEnvironment("STORAGE_BLOB_ENDPOINT", scope.BlobUrl)
      // Do not inherit a debugger bootloader, inspector, or TLS override from the parent.
      .WithEnvironment("NODE_OPTIONS", "")
      .WithEnvironment("NODE_EXTRA_CA_CERTS", "")
      .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "1")
      .WithEnvironment("NODE_USE_SYSTEM_CA", "1")
      .WithIconName("Globe");
    // A literal-IPv4 .NET probe cannot validate an exact browser-only DNS SAN. A verified
    // scope-local host/SNI health adapter must precede real launch.
    return scope.WithTelemetry(scope.WithNativeEndpoint(website, "website", "https")
      .WithUrls(context =>
      {
        context.Urls.Clear();
        context.Urls.Add(new ResourceUrlAnnotation { Url = scope.WebsiteOrigin, DisplayText = "Website" });
      }));
  }
}
