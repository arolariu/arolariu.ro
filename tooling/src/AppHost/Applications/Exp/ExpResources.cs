namespace AppHost.Applications.Exp;

using AppHost.Infrastructure.Sql;
using AppHost.LocalDevelopment;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Python;
using global::LocalDevelopment.Data;

/// <summary>Owns the exp service's local endpoint overlay.</summary>
internal static class ExpResources
{
  internal static IResourceBuilder<PythonAppResource> AddExp(this IDistributedApplicationBuilder builder,
    RepositoryLayout layout) =>
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
      .WithIconName("KeyMultiple")
      .WithHttpHealthCheck("/api/ready");

  internal static IResourceBuilder<ExecutableResource> AddScopedExp(this IDistributedApplicationBuilder builder,
    RepositoryLayout layout, WorktreeLaunchScope scope)
  {
    var exp = builder.AddExecutable("exp", scope.Runtime.PythonExecutable, layout.ExpDirectory,
        "-I", "-m", "uvicorn", "main:app", "--app-dir", layout.ExpDirectory,
        "--host", WorktreeLaunchScope.LoopbackHost, "--port",
        scope.Port("exp").ToString(System.Globalization.CultureInfo.InvariantCulture), "--reload", "--reload-dir", layout.ExpDirectory)
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("EXP_LOCAL_CONFIG_PATH", scope.Runtime.ExpConfigPath)
      .WithEnvironment("PYTHONHOME", "")
      .WithEnvironment("PYTHONPATH", "")
      .WithEnvironment("PYTHONUSERBASE", "")
      .WithIconName("KeyMultiple");
    return scope.WithTelemetry(scope.WithNativeEndpoint(exp, "exp", "http").WithHttpHealthCheck("/api/ready"));
  }

  /// <summary>Endpoint-only projection for the protected runtime preparation adapter; never copies developer config.</summary>
  internal static IReadOnlyDictionary<string, string> CreateScopedEndpointOverrides(string sqlPassword, WorktreeLaunchScope scope) =>
    new Dictionary<string, string>(StringComparer.Ordinal)
    {
      ["Endpoints:Database:NoSQL"] =
        $"AccountEndpoint={scope.Url("cosmos", "http")}/;AccountKey={Constants.CosmosEmulatorWellKnownKey};",
      ["Endpoints:Database:SQL"] =
        SqlResources.CreateConnectionString(sqlPassword, LocalDataContract.SqlDatabaseName, port: scope.Port("sql")),
      ["Endpoints:Storage:Blob"] = scope.BlobUrl,
      ["Endpoints:Storage:Queue"] = scope.QueueUrl,
      ["Endpoints:Service:Api"] = scope.Url("api", "https"),
      ["Endpoints:Observability:Telemetry"] = "",
    };

  internal static IReadOnlyDictionary<string, string> CreateEndpointOverrides(string sqlPassword) =>
    new Dictionary<string, string>(StringComparer.Ordinal)
    {
      ["Endpoints:Database:NoSQL"] =
        $"AccountEndpoint=https://localhost:{Constants.CosmosGatewayPort}/;AccountKey={Constants.CosmosEmulatorWellKnownKey};",
      ["Endpoints:Database:SQL"] =
        SqlResources.CreateConnectionString(sqlPassword, LocalDataContract.SqlDatabaseName),
      ["Endpoints:Storage:Blob"] = $"http://localhost:{Constants.AzuriteBlobPort}/devstoreaccount1",
      ["Endpoints:Service:Api"] = $"https://localhost:{Constants.ApiPort}",
    };
}
