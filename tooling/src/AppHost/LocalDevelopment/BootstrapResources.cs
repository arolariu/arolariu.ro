namespace AppHost.LocalDevelopment;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;

/// <summary>Registers the guarded, local-only scenario command.</summary>
internal static class BootstrapResources
{
  internal static IResourceBuilder<ProjectResource> AddBootstrap(
    this IDistributedApplicationBuilder builder, string seedDataDirectory)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(seedDataDirectory);
    return builder.AddProject<Projects.LocalDevelopment_Bootstrap>("local-bootstrap")
      .WithEnvironment("DOTNET_ENVIRONMENT", "Development")
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("SEED_DATA_DIRECTORY", seedDataDirectory)
      .ExcludeFromManifest()
      .WithIconName("DatabaseLightning");
  }
}
