namespace AppHost.LocalDevelopment;

using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;

/// <summary>Registers local persona lookup and token creation without publishing the helper.</summary>
internal static class IdentityResources
{
  internal static IResourceBuilder<ProjectResource> AddIdentity(
    this IDistributedApplicationBuilder builder, RepositoryLayout layout, WorktreeLaunchScope? scope = null)
  {
    if (scope is not null)
    {
      var identity = builder.AddProject<Projects.LocalDevelopment_Identity>("local-identities",
          options => options.ExcludeLaunchProfile = true)
        .WithEnvironment("DOTNET_ENVIRONMENT", "Development")
        .WithEnvironment("INFRA", "local")
        .WithEnvironment("ASPNETCORE_URLS", scope.Url("localIdentity", "http"))
        .WithEnvironment("LOCAL_CONFIG_PATH", scope.Runtime.ExpConfigPath)
        .WithEnvironment("LOCAL_SWAGGER_ORIGIN", scope.Url("api", "https"))
        .ExcludeFromManifest()
        .WithIconName("PersonKey");
      return scope.WithNativeEndpoint(identity, "localIdentity", "http").WithHttpHealthCheck("/health");
    }
    ArgumentException.ThrowIfNullOrWhiteSpace(layout.GeneratedConfigPath);
    string swaggerOrigin = $"https://localhost:{Constants.ApiPort}";
    return builder.AddProject<Projects.LocalDevelopment_Identity>("local-identities")
      .WithHttpEndpoint(port: Constants.LocalIdentityPort, name: "http", isProxied: false)
      .WithEnvironment("DOTNET_ENVIRONMENT", "Development")
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("LOCAL_CONFIG_PATH", layout.GeneratedConfigPath)
      .WithEnvironment("LOCAL_SWAGGER_ORIGIN", swaggerOrigin)
      .ExcludeFromManifest()
      .WithIconName("PersonKey")
      .WithHttpHealthCheck("/health");
  }
}
