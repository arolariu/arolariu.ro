namespace AppHost.Applications;

using System.Globalization;
using AppHost.LocalDevelopment;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.JavaScript;

/// <summary>Contains independent sites sharing the workspace installer.</summary>
internal sealed record AuxiliarySites(
  IResourceBuilder<ViteAppResource> Cv,
  IResourceBuilder<JavaScriptAppResource> Docs,
  IResourceBuilder<ViteAppResource> Status);

/// <summary>Registers small auxiliary sites without API or local-scenario dependencies.</summary>
internal static class AuxiliarySiteResources
{
  internal static AuxiliarySites AddAuxiliarySites(this IDistributedApplicationBuilder builder, RepositoryLayout layout)
  {
    var cv = builder.AddViteApp("cv", layout.CvDirectory)
      .WithHttpEndpoint(port: Constants.CvPort, env: "PORT")
      .WithIconName("PersonAccounts")
      .WithHttpHealthCheck("/");
    var docs = builder.AddJavaScriptApp("docs", layout.DocsDirectory, runScriptName: "start")
      // Docusaurus already pins its port; a DCP proxy would bind it first.
      .WithHttpEndpoint(port: Constants.DocsPort, isProxied: false)
      .WithIconName("BookOpenGlobe")
      .WithHttpHealthCheck("/");
    var status = builder.AddViteApp("status", layout.StatusDirectory)
      .WithHttpEndpoint(port: Constants.StatusPort, env: "PORT")
      .WithIconName("PulseSquare")
      .WithHttpHealthCheck("/");
    return new(cv, docs, status);
  }

  internal static void AddScopedAuxiliarySites(this IDistributedApplicationBuilder builder,
    RepositoryLayout layout, WorktreeLaunchScope scope)
  {
    AddSite("cv", layout.CvDirectory, "vite/bin/vite.js", "PersonAccounts", "dev", "--strictPort");
    AddSite("docs", layout.DocsDirectory, "@docusaurus/core/bin/docusaurus.mjs", "BookOpenGlobe", "start", "--no-open");
    AddSite("status", layout.StatusDirectory, "vite/bin/vite.js", "PulseSquare", "dev", "--strictPort");

    void AddSite(string name, string directory, string cli, string icon, params string[] command)
    {
      string[] args = [Path.Combine(layout.RootDirectory, "node_modules", cli),
        .. command, "--host", WorktreeLaunchScope.LoopbackHost,
        "--port", scope.Port(name).ToString(CultureInfo.InvariantCulture)];
      var app = builder.AddExecutable(name, scope.Runtime.NodeExecutable, directory, args)
        .WithEnvironment("NODE_OPTIONS", "")
        .WithIconName(icon);
      scope.WithNativeEndpoint(app, name, "http").WithHttpHealthCheck("/");
    }
  }
}
