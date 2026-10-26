namespace AppHost.LocalDevelopment;

using AppHost.Infrastructure;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Python;

/// <summary>Contains the local-only helper processes required by API startup.</summary>
internal sealed record LocalResources(
  IResourceBuilder<ProjectResource> Bootstrap,
  IResourceBuilder<ProjectResource> Identity);

/// <summary>Registers guarded scenario and persona resources without publishing them.</summary>
internal static class LocalDevelopmentResources
{
  internal static LocalResources AddLocalResources(this IDistributedApplicationBuilder builder,
    LocalInfrastructure infrastructure, IResourceBuilder<PythonAppResource> exp, RepositoryLayout layout)
  {
    var bootstrapEnvironment =
      LocalDevelopmentResourceConfiguration.CreateBootstrapEnvironment("SeedData/scenario.v1.json");
    var bootstrap = builder.AddProject<Projects.LocalDevelopment_Bootstrap>("local-bootstrap")
      .WithReference(infrastructure.CosmosDatabase)
      .WithReference(infrastructure.Blobs)
      .WithReference(infrastructure.Queues)
      .WithEnvironment("DOTNET_ENVIRONMENT", bootstrapEnvironment["DOTNET_ENVIRONMENT"])
      .WithEnvironment("INFRA", bootstrapEnvironment["INFRA"])
      .WithEnvironment("SEED_MANIFEST_PATH", bootstrapEnvironment["SEED_MANIFEST_PATH"])
      .WaitFor(infrastructure.CosmosInvoices)
      .WaitFor(infrastructure.CosmosMerchants)
      .WaitFor(infrastructure.Blobs)
      .WaitFor(infrastructure.Queues)
      .ExcludeFromManifest()
      .WithIconName("DatabaseLightning");
    var identityEnvironment = LocalDevelopmentResourceConfiguration.CreateIdentityEnvironment(
      layout.GeneratedConfigPath, $"http://localhost:{Constants.ApiPort}");
    var identity = builder.AddProject<Projects.LocalDevelopment_Identity>("local-identities")
      .WithHttpEndpoint(port: Constants.LocalIdentityPort, name: "http", isProxied: false)
      .WithEnvironment("DOTNET_ENVIRONMENT", identityEnvironment["DOTNET_ENVIRONMENT"])
      .WithEnvironment("INFRA", identityEnvironment["INFRA"])
      .WithEnvironment("LOCAL_CONFIG_PATH", identityEnvironment["LOCAL_CONFIG_PATH"])
      .WithEnvironment("LOCAL_SWAGGER_ORIGIN", identityEnvironment["LOCAL_SWAGGER_ORIGIN"])
      .WaitFor(exp)
      .ExcludeFromManifest()
      .WithIconName("PersonKey")
      .WithHttpHealthCheck("/health");
    return new(bootstrap, identity);
  }
}
