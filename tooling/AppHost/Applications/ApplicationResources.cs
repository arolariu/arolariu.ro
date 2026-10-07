namespace AppHost.Applications;

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
    var api = builder.AddProject<Projects.arolariu_Backend_Core>("api")
      .WithHttpEndpoint(port: Constants.ApiPort, name: "http")
      .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
      .WithEnvironment("LOCAL_DEVELOPMENT_IDENTITY_URL", local.Identity.GetEndpoint("http"))
      .WithReference(exp)
      .WaitForCompletion(local.Bootstrap)
      .WaitFor(local.Identity)
      .WaitFor(exp)
      .WithIconName("CodeBlock")
      .WithHttpHealthCheck("/health");
    builder.AddNextJsApp("website", layout.WebsiteDirectory)
      // Next owns HTTPS; NODE_OPTIONS must not reach the npm installer resource.
      .WithHttpsEndpoint(port: Constants.WebsitePort, env: "PORT")
      .WithReference(api)
      .WithReference(exp)
      .WithEnvironment("API_URL", api.GetEndpoint("http"))
      .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
      .WaitFor(api)
      .WithIconName("Globe");
    builder.AddViteApp("cv", layout.CvDirectory)
      .WithHttpEndpoint(port: Constants.CvPort, env: "PORT")
      .WithIconName("PersonAccounts");
    builder.AddJavaScriptApp("docs", layout.DocsDirectory, runScriptName: "start")
      // Docusaurus already pins its port; a DCP proxy would bind it first.
      .WithHttpEndpoint(port: Constants.DocsPort, isProxied: false)
      .WithIconName("BookOpenGlobe");
    builder.AddViteApp("status", layout.StatusDirectory)
      .WithHttpEndpoint(port: Constants.StatusPort, env: "PORT")
      .WithIconName("PulseSquare");
  }
}
