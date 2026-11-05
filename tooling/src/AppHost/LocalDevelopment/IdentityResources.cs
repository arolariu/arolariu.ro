namespace AppHost.LocalDevelopment;

using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;

/// <summary>Registers local persona lookup and token creation without publishing the helper.</summary>
internal static class IdentityResources
{
  internal static IResourceBuilder<ProjectResource> AddIdentity(
    this IDistributedApplicationBuilder builder, RepositoryLayout layout)
  {
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
