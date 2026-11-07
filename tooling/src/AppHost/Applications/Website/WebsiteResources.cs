namespace AppHost.Applications.Website;

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
}
