namespace AppHost.Applications.JavaScript;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.JavaScript;

/// <summary>
/// Replaces the JavaScript integration's per-app installers with one npm install for the whole workspace.
/// </summary>
/// <remarks>
/// Every app lives in the same npm workspace, so each per-app installer reinstalls the whole workspace; running
/// several at once races over the shared <c>node_modules</c>.
/// </remarks>
internal static class SharedNpmInstall
{
  /// <summary>The name of the shared installer resource.</summary>
  internal const string ResourceName = "npm-install";

  /// <summary>Adds a single <c>npm install</c> for the npm workspace at the repository root.</summary>
  /// <param name="builder">The distributed application builder.</param>
  /// <param name="rootDirectory">The repository root that owns the npm workspace.</param>
  /// <returns>The shared installer resource builder.</returns>
  internal static IResourceBuilder<JavaScriptInstallerResource> AddSharedNpmInstall(
    this IDistributedApplicationBuilder builder, string rootDirectory)
  {
    ArgumentNullException.ThrowIfNull(builder);
    return builder.AddResource(new JavaScriptInstallerResource(ResourceName, rootDirectory))
      .WithCommand("npm")
      .WithArgs("install", "--no-audit", "--no-fund")
      .WithCertificateTrustScope(CertificateTrustScope.None)
      // The AppHost can inherit a debugger bootloader through NODE_OPTIONS; npm must never load it.
      .WithEnvironment("NODE_OPTIONS", string.Empty)
      .ExcludeFromManifest();
  }

  /// <summary>Makes a JavaScript app wait for the shared install instead of running its own installer.</summary>
  /// <remarks>Call this last among the app's package-manager calls; a later one would recreate the per-app installer.</remarks>
  /// <typeparam name="T">The JavaScript app resource type.</typeparam>
  /// <param name="app">The JavaScript app resource builder.</param>
  /// <param name="sharedInstall">The shared workspace installer.</param>
  /// <returns>The app resource builder.</returns>
  internal static IResourceBuilder<T> UseSharedNpmInstall<T>(
    this IResourceBuilder<T> app, IResourceBuilder<JavaScriptInstallerResource> sharedInstall)
    where T : JavaScriptAppResource
  {
    ArgumentNullException.ThrowIfNull(app);
    ArgumentNullException.ThrowIfNull(sharedInstall);
    app.WithNpm(install: false);

    // WithNpm(install: false) only disables the per-app installer; remove it so no NotStarted leftover remains.
    JavaScriptPackageInstallerAnnotation? installer =
      app.Resource.Annotations.OfType<JavaScriptPackageInstallerAnnotation>().LastOrDefault();
    if (installer is not null)
    {
      IResource orphan = installer.Resource;
      List<IResourceAnnotation> links = app.Resource.Annotations.Where(annotation =>
        ReferenceEquals(annotation, installer)
        || (annotation is ResourceRelationshipAnnotation relationship && ReferenceEquals(relationship.Resource, orphan))
        || (annotation is WaitAnnotation wait && ReferenceEquals(wait.Resource, orphan))).ToList();
      foreach (IResourceAnnotation link in links)
      {
        app.Resource.Annotations.Remove(link);
      }

      app.ApplicationBuilder.Resources.Remove(orphan);
    }

    return app.WaitForCompletion(sharedInstall);
  }
}
