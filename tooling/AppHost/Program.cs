using AppHost;
using AppHost.Aspire;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;

#pragma warning disable ASPIREJAVASCRIPT001  // AddNextJsApp is experimental in Aspire 13.x
#pragma warning disable ASPIRECERTIFICATES001 // WithoutHttpsCertificate is evaluation-only in 13.x
#pragma warning disable ASPIRECOSMOSDB001     // RunAsPreviewEmulator is experimental in 13.x

var builder = DistributedApplication.CreateBuilder(args);

// ─────────────────────────────────────────────────────────────────────
// Infrastructure — native Aspire 13.x declarations.
// Mirrors infra/Local/Storage/docker-compose.yml ports/credentials so
// exp's existing config.docker.json keeps working without modification.
// (Aspire 13.x has no AddDockerComposeFile; native declarations are the
// canonical pattern.)
// ─────────────────────────────────────────────────────────────────────

var sqlPassword = builder.AddParameter("sql-password", Constants.SqlPassword, secret: true);
var sql = builder
    .AddSqlServer("mssql", password: sqlPassword, port: Constants.SqlPort)
    .WithDataVolume(Constants.SqlDataVolume)
    .WithIconName("Database");

// Use RunAsPreviewEmulator for the Linux-based vnext emulator (matches the
// compose container in infra/Local/Storage/docker-compose.yml). The default
// RunAsEmulator picks the legacy Windows-based emulator which has different
// port semantics and doesn't support AZURE_COSMOS_EMULATOR_ENABLE_DATA_PLANE_HTTP.
var cosmos = builder
    .AddAzureCosmosDB("cosmos")
    .RunAsPreviewEmulator(emulator => emulator
        .WithGatewayPort(Constants.CosmosGatewayPort)
        .WithDataExplorer()
        .WithEnvironment("AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE", "true")
        .WithEnvironment("AZURE_COSMOS_EMULATOR_ENABLE_DATA_PLANE_HTTP", "true"))
    .WithIconName("DatabaseMultiple");

// Database + containers (mirrors the selfhost-start.sh bootstrap that runs
// `cosmos.NewDatabase('primary')` + creates invoices/merchants containers).
var cosmosPrimaryDb = cosmos.AddCosmosDatabase(Constants.CosmosDatabaseName);
var cosmosInvoices  = cosmosPrimaryDb.AddContainer(
    Constants.CosmosInvoicesContainer,
    partitionKeyPath: Constants.CosmosInvoicesPartitionKey);
var cosmosMerchants = cosmosPrimaryDb.AddContainer(
    Constants.CosmosMerchantsContainer,
    partitionKeyPath: Constants.CosmosMerchantsPartitionKey);

var storage = builder
    .AddAzureStorage("storage")
    .RunAsEmulator(emulator => emulator
        .WithBlobPort(Constants.AzuriteBlobPort))
    .WithIconName("Storage");

var redisPassword = builder.AddParameter("redis-password", Constants.RedisPassword, secret: true);
var redis = builder
    .AddRedis("redis", port: Constants.RedisPort, password: redisPassword)
    .WithDataVolume(Constants.RedisDataVolume)
    .WithoutHttpsCertificate() // redis:alpine doesn't speak TLS; Aspire 13.x defaults to TLS-on
    .WithIconName("Memory");

// ─────────────────────────────────────────────────────────────────────
// exp config service — native Python via uvicorn (FastAPI/ASGI).
// (AddUvicornApp is the FastAPI-recommended method in Aspire 13.x; uses
// existing .venv in sites/exp.arolariu.ro/ automatically.)
// ─────────────────────────────────────────────────────────────────────

var exp = builder
    .AddUvicornApp("exp", "../../sites/exp.arolariu.ro", "main:app")
    .WithPip() // force pip mode (uv may not be installed)
    .WithVirtualEnvironment(".venv")
    .WithHttpEndpoint(port: Constants.ExpPort, env: "PORT")
    .WithEnvironment("INFRA", "local")
    .WithEnvironment("EXP_LOCAL_CONFIG_PATH", "config.docker.json")
    .WaitFor(sql)
    .WaitFor(cosmos)
    .WaitFor(storage)
    .WithIconName("KeyMultiple")
    .WithHttpHealthCheck("/api/ready");

// ─────────────────────────────────────────────────────────────────────
// .NET API. API reads connection strings from exp at startup; Aspire
// injects EXP_PROXY_URL pointing at the native exp endpoint.
// ─────────────────────────────────────────────────────────────────────

var api = builder
    .AddProject<Projects.arolariu_Backend_Core>("api")
    .WithHttpEndpoint(port: Constants.ApiPort, name: "http")
    .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
    .WithReference(exp)
    .WaitFor(exp)
    .WithIconName("CodeBlock")
    .WithHttpHealthCheck("/health");

// ─────────────────────────────────────────────────────────────────────
// Website — Next.js (AddNextJsApp is Aspire 13.x dedicated method).
// ─────────────────────────────────────────────────────────────────────

var website = builder
    .AddNextJsApp("website", "../../sites/arolariu.ro")
    .WithHttpEndpoint(port: Constants.WebsitePort, env: "PORT")
    .WithReference(api)
    .WithReference(exp)
    .WithEnvironment("API_URL", api.GetEndpoint("http"))
    .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
    .WaitFor(api)
    .WithIconName("Globe");

// ─────────────────────────────────────────────────────────────────────
// SvelteKit CV — standalone (no API/exp reference).
// ─────────────────────────────────────────────────────────────────────

var cv = builder
    .AddViteApp("cv", "../../sites/cv.arolariu.ro")
    .WithHttpEndpoint(port: Constants.CvPort, env: "PORT")
    .WithIconName("PersonAccounts");

// ─────────────────────────────────────────────────────────────────────
// Docusaurus docs site — standalone.
// Uses the existing "start" script (docusaurus start --port 3100); the
// port is pinned in the script itself, so we match it on the endpoint
// and skip env-injection (the CLI flag wins over $PORT).
// ─────────────────────────────────────────────────────────────────────

var docs = builder
    .AddJavaScriptApp("docs", "../../sites/docs.arolariu.ro", runScriptName: "start")
    .WithHttpEndpoint(port: Constants.DocsPort)
    .WithIconName("BookOpenGlobe");

// ─────────────────────────────────────────────────────────────────────
// Status page — SvelteKit, standalone.
// ─────────────────────────────────────────────────────────────────────

var status = builder
    .AddViteApp("status", "../../sites/status.arolariu.ro")
    .WithHttpEndpoint(port: Constants.StatusPort, env: "PORT")
    .WithIconName("PulseSquare");

// ─────────────────────────────────────────────────────────────────────
// exp config-file generator — rewrites sites/exp.arolariu.ro/config.docker.json
// in-place with Aspire-allocated localhost endpoints once infra is ready;
// restores the original content on graceful shutdown.
// (exp's loader still reads config.docker.json — no Python code change.)
// ─────────────────────────────────────────────────────────────────────
// Helper: look up an allocated endpoint by name, trying multiple candidates
// (Aspire endpoint names differ across resource types: cosmos preview emulator
// might use "gateway"/"emulator"/"http"/"https" depending on version).
// Throws with a diagnostic listing of available endpoints when none match.
static int LookupEndpointPort(IResource resource, params string[] candidateNames)
{
    var endpoints = resource.Annotations.OfType<EndpointAnnotation>().ToList();
    foreach (var name in candidateNames)
    {
        var ep = endpoints.FirstOrDefault(a =>
            string.Equals(a.Name, name, StringComparison.OrdinalIgnoreCase));
        if (ep?.AllocatedEndpoint is not null)
            return ep.AllocatedEndpoint.Port;
    }
    var available = string.Join(", ", endpoints.Select(a =>
        $"{a.Name}={a.AllocatedEndpoint?.Port.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "(unallocated)"}"));
    throw new InvalidOperationException(
        $"None of [{string.Join(",", candidateNames)}] endpoints found on resource '{resource.Name}'. "
        + $"Available: [{available}]");
}

builder.AddExpConfigGenerator(
    configPath: "../../sites/exp.arolariu.ro/config.docker.json",
    connectionStringFactories: new Dictionary<string, Func<string>>
    {
        ["Endpoints:Database:NoSQL"] = () =>
        {
            var port = LookupEndpointPort(cosmos.Resource, "https", "gateway", "emulator", "http");
            return $"AccountEndpoint=https://localhost:{port}/;"
                 + $"AccountKey={Constants.CosmosEmulatorAccountKey};";
        },
        ["Endpoints:Database:SQL"] = () =>
        {
            var port = LookupEndpointPort(sql.Resource, "tcp", "sql", "tds");
            return $"Server=localhost,{port};Database={Constants.SqlDatabaseName};User Id=sa;"
                 + $"Password={Constants.SqlPassword};TrustServerCertificate=true;";
        },
        ["Endpoints:Storage:Blob"] = () =>
        {
            var port = LookupEndpointPort(storage.Resource, "blob", "http", "https");
            return $"http://localhost:{port}/devstoreaccount1";
        },
        ["Endpoints:Service:Api"] = () => $"http://localhost:{Constants.ApiPort}",
    },
    waitForResources: new IResource[]
    {
        cosmos.Resource,
        sql.Resource,
        storage.Resource,
    });

builder.Build().Run();
