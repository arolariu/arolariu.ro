namespace AppHost.Applications.Api;

using AppHost.LocalDevelopment;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;

/// <summary>Registers the API's native endpoint and health contract.</summary>
internal static class ApiResources
{
  internal static IResourceBuilder<ProjectResource> AddApi(this IDistributedApplicationBuilder builder) =>
    builder.AddProject<Projects.arolariu_Backend_Core>("api")
      // Upgrade the launch endpoint so Aspire supplies Kestrel's trusted development certificate.
      .WithEndpoint("http", endpoint =>
      {
        endpoint.UriScheme = "https";
        endpoint.Port = Constants.ApiPort;
      })
      .WithIconName("CodeBlock")
      .WithHttpHealthCheck("/health");

  internal static IResourceBuilder<ProjectResource> AddScopedApi(
    this IDistributedApplicationBuilder builder, WorktreeLaunchScope scope)
  {
    var api = builder.AddProject<Projects.arolariu_Backend_Core>("api", options => options.ExcludeLaunchProfile = true)
      .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Development")
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("AZURE_CLIENT_ID", "")
      .WithEnvironment("ASPNETCORE_URLS", scope.Url("api", "https"))
      .WithEnvironment("Kestrel__Certificates__Default__Path", scope.Runtime.ServiceCertificatePath)
      .WithEnvironment("Kestrel__Certificates__Default__KeyPath", scope.Runtime.ServiceKeyPath)
      .WithEnvironment("EXP_PROXY_URL", scope.Url("exp", "http"))
      .WithEnvironment("LOCAL_DEVELOPMENT_IDENTITY_URL", scope.Url("localIdentity", "http"))
      .WithEnvironment("LOCAL_SWAGGER_ORIGIN", scope.Url("api", "https"))
      .WithIconName("CodeBlock");
    return scope.WithTelemetry(scope.WithNativeEndpoint(api, "api", "https").WithHttpHealthCheck("/health"), grpc: true);
  }
}
