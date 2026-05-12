using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Infra: Storage compose (SQL + Cosmos + Azurite + Redis; exp excluded via profile)
var storage = builder.AddDockerComposeFile(
    name: "storage",
    composeFilePath: "../../infra/Local/Storage/docker-compose.yml");

// Infra: Management compose (Traefik + healthchecks + mkcert)
var management = builder.AddDockerComposeFile(
    name: "management",
    composeFilePath: "../../infra/Local/Management/docker-compose.yml");

// exp config service — native Python (uvicorn --reload)
var exp = builder.AddPythonApp(
    name: "exp",
    projectDirectory: "../../sites/exp.arolariu.ro",
    scriptPath: "main.py",
    virtualEnvironmentPath: ".venv",
    scriptArgs: new[]
    {
        "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", "5002",
        "--reload"
    })
    .WithHttpEndpoint(port: 5002, targetPort: 5002)
    .WithEnvironment("INFRA", "local")
    .WithEnvironment("EXP_LOCAL_CONFIG_PATH", "config.docker.json")
    .WaitFor(storage);

// .NET API (port 5000 pinned to match selfhost convention)
var api = builder.AddProject<Projects.arolariu_Backend_Core>("api")
    .WithHttpEndpoint(port: 5000, name: "http")
    .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
    .WithReference(exp)
    .WaitFor(exp);

// Website — Next.js dev server (port 3000)
var website = builder.AddNpmApp(
    name: "website",
    workingDirectory: "../../sites/arolariu.ro",
    scriptName: "dev")
    .WithReference(api)
    .WithEnvironment("API_URL", api.GetEndpoint("http"))
    .WithHttpEndpoint(env: "PORT", port: 3000);

builder.Build().Run();
