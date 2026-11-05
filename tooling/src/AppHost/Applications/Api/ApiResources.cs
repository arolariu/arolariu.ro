namespace AppHost.Applications.Api;

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
}
