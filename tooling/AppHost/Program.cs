using AppHost;
using AppHost.Aspire;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

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
    // Bypass Aspire's DCP proxy. DCP is application-aware (HTTP/1.1, HTTP/2) and
    // mishandles raw TCP protocols like SQL Server's TDS — first handshake hangs
    // for 10+ seconds, the SqlClient pool gets poisoned, and subsequent connects
    // fast-fail with "TCP Provider, error: 0 - The wait operation timed out".
    // isProxied: false makes Docker map host port -> container port directly
    // (same as the selfhost compose stack), so TDS rides plain TCP.
    .WithEndpoint("tcp", endpoint => endpoint.IsProxied = false)
    .WithIconName("Database");

// Declare the 'arolariu-sql' database as an Aspire resource. WithCreationScript
// runs an idempotent CREATE DATABASE the first time this resource initializes
// (mirrors the selfhost-start.sh bootstrap that does the same on the compose
// stack). Downstream services that WaitFor(sqlDb) won't start until the
// database exists and is queryable, eliminating the "Cannot open database"
// failure on a fresh container.
var sqlDb = sql.AddDatabase(Constants.SqlDatabaseName)
    .WithCreationScript($"""
        IF DB_ID('{Constants.SqlDatabaseName}') IS NULL
            CREATE DATABASE [{Constants.SqlDatabaseName}];
        """);

// Gate WaitFor(sql) on TDS-readiness (not just container "Running"). AddSqlServer
// wires no built-in health check, so WaitFor would otherwise resolve as soon as
// the container starts — well before SQL Server's TDS listener accepts queries.
// Without this gate, downstream services (exp, api) hit a half-initialized SQL
// Server and the SqlClient connection pool gets poisoned by the failed handshake.
builder.Services.AddHealthChecks().AddAsyncCheck("sql-ready", async () =>
{
    // Connect to 'master' (always exists on a fresh container) — the readiness
    // probe just needs to verify TDS is accepting queries, not that the app's
    // database exists yet. The app's database is created later by EF migrations
    // / API bootstrap. Encrypt=False bypasses the vpnkit-mangled TLS handshake
    // that Docker Desktop on Windows produces; equivalent to selfhost's Docker-
    // network path which is unencrypted by default.
    var connStr = $"Server=127.0.0.1,{Constants.SqlPort};Database=master;User Id=sa;"
                + $"Password={Constants.SqlPassword};Encrypt=False;TrustServerCertificate=true;"
                + $"Connection Timeout=5;";

    try
    {
        await using var conn = new SqlConnection(connStr);
        await conn.OpenAsync().ConfigureAwait(false);
        await using var cmd = new SqlCommand("SELECT 1", conn);
        await cmd.ExecuteScalarAsync().ConfigureAwait(false);
        return HealthCheckResult.Healthy();
    }
    catch (Exception ex)
    {
        return HealthCheckResult.Unhealthy(ex.Message);
    }
});
sql.WithHealthCheck("sql-ready");

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

// Azurite ships with no CORS rules and no containers — apply allow-all on every
// startup so browser uploads from https://localhost:3000 → http://localhost:10000
// succeed, and idempotently create the 'invoices' container so the first upload
// from uploadScan.ts doesn't 404 with ContainerNotFound. In production these are
// provisioned by Bicep; this brings the local emulator to the same starting state.
// See Aspire/AzuriteBootstrap.cs for the retry / event-subscription details.
builder.AddAzuriteBootstrap(storage, Constants.AzuriteBlobPort, "invoices");

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
    // isProxied: false — uvicorn binds host 5002 directly. With DCP in the path,
    // Aspire promotes the endpoint URL to https://localhost:5002 in run mode but
    // doesn't terminate TLS (uvicorn speaks HTTP only), so clients hit
    // "SSL connection could not be established / unexpected EOF". Bypassing DCP
    // keeps EXP_PROXY_URL as http://localhost:5002 — what uvicorn actually serves.
    .WithHttpEndpoint(port: Constants.ExpPort, env: "PORT", isProxied: false)
    .WithEnvironment("INFRA", "local")
    .WithEnvironment("EXP_LOCAL_CONFIG_PATH", "config.docker.json")
    // Force the Python opentelemetry-exporter-otlp-proto-http exporter to hit the
    // Aspire dashboard's HTTP OTLP endpoint (21031). By default Aspire injects
    // OTEL_EXPORTER_OTLP_ENDPOINT pointing at the gRPC endpoint (21030), which
    // requires an h2 ALPN handshake the plain-HTTP exporter can't perform —
    // every metrics / logs export then fails with:
    //   ssl.SSLError: [SSL] tlsv1 alert no application protocol (_ssl.c:1010)
    // Explicitly setting protocol + endpoint here picks the right transport.
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "https://localhost:21031")
    .WaitFor(sqlDb)       // waits for sql-ready + database creation
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
    // Next.js dev serves HTTPS via its own self-signed cert (--experimental-https).
    // Declare the binding as https so the Aspire dashboard's clickable URL matches
    // what the browser actually opens (https://localhost:3000), instead of an http://
    // URL that would just redirect.
    .WithHttpsEndpoint(port: Constants.WebsitePort, env: "PORT")
    .WithReference(api)
    .WithReference(exp)
    .WithEnvironment("API_URL", api.GetEndpoint("http"))
    .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
    .WaitFor(api)
    .WithIconName("Globe");
// Server-side Node debugger for the website is enabled in sites/arolariu.ro/package.json's
// dev script (`next dev --inspect ...`), not via NODE_OPTIONS here. Pushing NODE_OPTIONS
// via Aspire's WithEnvironment propagates to the website-installer resource, which spawns
// `npm install`; npm 11's workspace arborist hits a null state under concurrent --inspect
// children and aborts with "Cannot read properties of null (reading 'location')". See
// .vscode/launch.json "Attach to Next.js (Aspire)" for the attach config on port 9229.

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
            // Encrypt=False: SQL Server 2022 default forces TLS, but Docker Desktop's
            // vpnkit port-forwarding on Windows reliably stalls the TLS handshake step
            // *after* TCP accepts (PRE-LOGIN reaches the server, TLS upgrade never
            // completes — SqlClient hangs ~15s then reports "TCP Provider, error: 0".)
            // Selfhost mode avoids this because containers reach each other via Docker
            // network names (mssql:1433) without vpnkit in the path. Matching that path
            // here by disabling TLS at the TDS layer. 127.0.0.1 (not localhost) skips
            // the IPv6 first-try fallback that SqlClient does by default.
            return $"Server=127.0.0.1,{port};Database={Constants.SqlDatabaseName};User Id=sa;"
                 + $"Password={Constants.SqlPassword};Encrypt=False;TrustServerCertificate=true;";
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
