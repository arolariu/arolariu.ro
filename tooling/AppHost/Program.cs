using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using AppHost.Aspire;

#pragma warning disable ASPIREJAVASCRIPT001  // AddNextJsApp is experimental in Aspire 13.x
#pragma warning disable ASPIRECERTIFICATES001 // WithoutHttpsCertificate is evaluation-only in 13.x

var builder = DistributedApplication.CreateBuilder(args);

// ─────────────────────────────────────────────────────────────────────
// Infrastructure — native Aspire 13.x declarations.
// Mirrors infra/Local/Storage/docker-compose.yml ports/credentials so
// exp's existing config.docker.json keeps working without modification.
// (Aspire 13.x has no AddDockerComposeFile; native declarations are the
// canonical pattern.)
// ─────────────────────────────────────────────────────────────────────

var sqlPassword = builder.AddParameter("sql-password", "qazWSXedcRFV1234!", secret: true);
var sql = builder
    .AddSqlServer("mssql", password: sqlPassword, port: 8082)
    .WithDataVolume("arolariu-mssql-data");

var cosmos = builder
    .AddAzureCosmosDB("cosmos")
    .RunAsEmulator(emulator => emulator
        .WithGatewayPort(8081)
        .WithEnvironment("AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE", "true")
        .WithEnvironment("AZURE_COSMOS_EMULATOR_ENABLE_DATA_PLANE_HTTP", "true"));

var storage = builder
    .AddAzureStorage("storage")
    .RunAsEmulator(emulator => emulator
        .WithBlobPort(10000));

var redisPassword = builder.AddParameter("redis-password", "RedisPassword123!", secret: true);
var redis = builder
    .AddRedis("redis", port: 6379, password: redisPassword)
    .WithDataVolume("arolariu-redis-data")
    .WithoutHttpsCertificate(); // redis:alpine doesn't speak TLS; Aspire 13.x defaults to TLS-on

// ─────────────────────────────────────────────────────────────────────
// Reverse proxy — Traefik with mkcert HTTPS.
// File-provider only (Aspire 13.x doesn't use docker labels for routing).
// Dynamic routes for native processes are wired by AddTraefikDynamicConfig
// (added in Task 8 of the implementation plan).
// ─────────────────────────────────────────────────────────────────────

var traefik = builder
    .AddContainer("traefik", "traefik:v3.6")
    .WithBindMount("../../infra/Local/Management/traefik/dynamic", "/etc/traefik/dynamic", isReadOnly: true)
    .WithBindMount("../../infra/Local/Management/certs", "/certs", isReadOnly: true)
    .WithEndpoint(port: 80, targetPort: 80, name: "web", scheme: "http")
    .WithEndpoint(port: 443, targetPort: 443, name: "websecure", scheme: "https")
    .WithEndpoint(port: 8080, targetPort: 8080, name: "traefik-dashboard", scheme: "http")
    .WithArgs(
        "--api.dashboard=true",
        "--api.insecure=true",
        "--providers.file.directory=/etc/traefik/dynamic",
        "--providers.file.watch=true",
        "--entrypoints.web.address=:80",
        "--entrypoints.websecure.address=:443",
        "--log.level=INFO");

// ─────────────────────────────────────────────────────────────────────
// exp config service — native Python via uvicorn (FastAPI/ASGI).
// (AddUvicornApp is the FastAPI-recommended method in Aspire 13.x; uses
// existing .venv in sites/exp.arolariu.ro/ automatically.)
// ─────────────────────────────────────────────────────────────────────

var exp = builder
    .AddUvicornApp("exp", "../../sites/exp.arolariu.ro", "main:app")
    .WithPip() // force pip mode (uv may not be installed)
    .WithVirtualEnvironment(".venv")
    .WithHttpEndpoint(port: 5002, env: "PORT")
    .WithEnvironment("INFRA", "local")
    .WithEnvironment("EXP_LOCAL_CONFIG_PATH", "config.docker.json")
    .WaitFor(sql)
    .WaitFor(cosmos)
    .WaitFor(storage);

// ─────────────────────────────────────────────────────────────────────
// .NET API. API reads connection strings from exp at startup; Aspire
// injects EXP_PROXY_URL pointing at the native exp endpoint.
// ─────────────────────────────────────────────────────────────────────

var api = builder
    .AddProject<Projects.arolariu_Backend_Core>("api")
    .WithHttpEndpoint(port: 5000, name: "http")
    .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
    .WithReference(exp)
    .WaitFor(exp);

// ─────────────────────────────────────────────────────────────────────
// Website — Next.js (AddNextJsApp is Aspire 13.x dedicated method).
// ─────────────────────────────────────────────────────────────────────

var website = builder
    .AddNextJsApp("website", "../../sites/arolariu.ro")
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithReference(api)
    .WithReference(exp)
    .WithEnvironment("API_URL", api.GetEndpoint("http"))
    .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
    .WaitFor(api);

// ─────────────────────────────────────────────────────────────────────
// SvelteKit CV — standalone (no API/exp reference).
// ─────────────────────────────────────────────────────────────────────

var cv = builder
    .AddViteApp("cv", "../../sites/cv.arolariu.ro")
    .WithHttpEndpoint(port: 4173, env: "PORT")
    .WaitFor(traefik);

// ─────────────────────────────────────────────────────────────────────
// Docusaurus docs site — standalone.
// Uses the existing "start" script (docusaurus start --port 3100); the
// port is pinned in the script itself, so we match it on the endpoint
// and skip env-injection (the CLI flag wins over $PORT).
// ─────────────────────────────────────────────────────────────────────

var docs = builder
    .AddJavaScriptApp("docs", "../../sites/docs.arolariu.ro", runScriptName: "start")
    .WithHttpEndpoint(port: 3100)
    .WaitFor(traefik);

// ─────────────────────────────────────────────────────────────────────
// Status page — SvelteKit, standalone.
// ─────────────────────────────────────────────────────────────────────

var status = builder
    .AddViteApp("status", "../../sites/status.arolariu.ro")
    .WithHttpEndpoint(port: 3002, env: "PORT")
    .WaitFor(traefik);

// ─────────────────────────────────────────────────────────────────────
// Traefik dynamic-config glue — writes *.localhost route entries when
// native services become ready; cleans up on shutdown.
// ─────────────────────────────────────────────────────────────────────

builder.AddTraefikDynamicConfig(
    targetFile: "../../infra/Local/Management/traefik/dynamic/aspire-services.yml",
    dynamicResources: new Dictionary<string, IResourceBuilder<IResourceWithEndpoints>>
    {
        ["api.localhost"]     = api,
        ["website.localhost"] = website,
        ["exp.localhost"]     = exp,
        ["cv.localhost"]      = cv,
        ["docs.localhost"]    = docs,
        ["status.localhost"]  = status,
    },
    staticRoutes: new Dictionary<string, (string scheme, int port)>
    {
        ["dashboard.localhost"] = ("http", 17081),
    });

builder.Build().Run();
