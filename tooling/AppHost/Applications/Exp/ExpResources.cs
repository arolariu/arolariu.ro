namespace AppHost.Applications.Exp;

using AppHost.Infrastructure.Sql;
using AppHost.Infrastructure;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Python;

/// <summary>Owns the exp service's local endpoint overlay.</summary>
internal static class ExpResources
{
  internal static IResourceBuilder<PythonAppResource> AddExp(this IDistributedApplicationBuilder builder,
    LocalInfrastructure infrastructure, RepositoryLayout layout) =>
    builder.AddUvicornApp("exp", layout.ExpDirectory, "main:app")
      .WithPip()
      .WithVirtualEnvironment(".venv")
      .WithHttpEndpoint(port: Constants.ExpPort, env: "PORT", isProxied: false)
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("EXP_LOCAL_CONFIG_PATH", "config.aspire.json")
      // Python's HTTP exporter must use the dashboard's HTTP OTLP endpoint.
      .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
      .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT",
        builder.Configuration["DOTNET_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"] ?? "https://localhost:21031")
      .WaitFor(infrastructure.SqlDatabase)
      .WaitFor(infrastructure.Cosmos)
      .WaitFor(infrastructure.Storage)
      .WithIconName("KeyMultiple")
      .WithHttpHealthCheck("/api/ready");

  internal static IReadOnlyDictionary<string, string> CreateEndpointOverrides(string sqlPassword) =>
    new Dictionary<string, string>(StringComparer.Ordinal)
    {
      ["Endpoints:Database:NoSQL"] =
        $"AccountEndpoint=https://localhost:{Constants.CosmosGatewayPort}/;AccountKey={Constants.CosmosEmulatorWellKnownKey};",
      ["Endpoints:Database:SQL"] =
        SqlResources.CreateConnectionString(sqlPassword, Constants.SqlDatabaseName),
      ["Endpoints:Storage:Blob"] = $"http://localhost:{Constants.AzuriteBlobPort}/devstoreaccount1",
      ["Endpoints:Service:Api"] = $"http://localhost:{Constants.ApiPort}",
    };
}
