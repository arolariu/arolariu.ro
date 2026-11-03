namespace AppHost.Applications;

using AppHost.Applications.JavaScript;
using AppHost.Applications.Website;
using AppHost.LocalDevelopment;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Python;

#pragma warning disable ASPIREJAVASCRIPT001

/// <summary>Registers applications and their explicit native startup dependencies.</summary>
internal static class ApplicationResources
{
  internal static void AddApplications(this IDistributedApplicationBuilder builder,
    RepositoryLayout layout, IResourceBuilder<PythonAppResource> exp, LocalResources local)
  {
    // One install for the whole npm workspace; per-app installers would race over the shared node_modules.
    var npmInstall = builder.AddSharedNpmInstall(layout.RootDirectory);
    var api = builder.AddProject<Projects.arolariu_Backend_Core>("api")
      // Upgrading the launch profile's "http" endpoint makes Aspire hand Kestrel its trusted developer certificate.
      .WithEndpoint("http", endpoint =>
      {
        endpoint.UriScheme = "https";
        endpoint.Port = Constants.ApiPort;
      })
      .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
      .WithEnvironment("LOCAL_DEVELOPMENT_IDENTITY_URL", local.Identity.GetEndpoint("http"))
      .WithReference(exp)
      .WaitForCompletion(local.Bootstrap)
      .WaitFor(local.Identity)
      .WaitFor(exp)
      .WithIconName("CodeBlock")
      .WithHttpHealthCheck("/health");
    builder.AddNextJsApp("website", layout.WebsiteDirectory)
      // Next owns HTTPS; NODE_OPTIONS must not reach the npm installer resource. Upgrading the integration's own
      // PORT-bound "http" endpoint in place (as Aspire does for Vite and uvicorn) avoids a second, dead endpoint.
      .WithEndpoint("http", endpoint =>
      {
        endpoint.UriScheme = "https";
        endpoint.Port = Constants.WebsitePort;
      })
      .WithReference(api)
      .WithReference(exp)
      .WithEnvironment("API_URL", api.GetEndpoint("http"))
      .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
      .WaitFor(api)
      .WithIconName("Globe")
      // 200 only when exp and the API are healthy; the trailing slash avoids Next's 308 redirect.
      .WithHttpHealthCheck("/api/health/")
      .WithDevelopmentCertificateRenewal(
        Path.Combine(layout.WebsiteDirectory, "certificates"), WebsiteCertificateRenewal.ResolveAuthorityDirectory(),
        TimeProvider.System, WebsiteCertificateRenewal.IsAuthorityTrusted)
      .UseSharedNpmInstall(npmInstall);
    builder.AddViteApp("cv", layout.CvDirectory)
      .WithHttpEndpoint(port: Constants.CvPort, env: "PORT")
      .WithIconName("PersonAccounts")
      .WithHttpHealthCheck("/")
      .UseSharedNpmInstall(npmInstall);
    builder.AddJavaScriptApp("docs", layout.DocsDirectory, runScriptName: "start")
      // Docusaurus already pins its port; a DCP proxy would bind it first.
      .WithHttpEndpoint(port: Constants.DocsPort, isProxied: false)
      .WithIconName("BookOpenGlobe")
      .WithHttpHealthCheck("/")
      .UseSharedNpmInstall(npmInstall);
    builder.AddViteApp("status", layout.StatusDirectory)
      .WithHttpEndpoint(port: Constants.StatusPort, env: "PORT")
      .WithIconName("PulseSquare")
      .WithHttpHealthCheck("/")
      .UseSharedNpmInstall(npmInstall);
  }
}
