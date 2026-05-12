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

// .NET API (port 5000 pinned to match selfhost convention)
var api = builder.AddProject<Projects.arolariu_Backend_Core>("api")
    .WithHttpEndpoint(port: 5000, name: "http")
    .WaitFor(storage);

builder.Build().Run();
