# Centralized Configuration Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple configuration from running apps by building `experiments.arolariu.ro` as a centralized config proxy service, centralizing Azure credential management, eliminating hardcoded values, and adding config refresh to the frontend.

**Architecture:** A new .NET 10 Minimal API (`experiments.arolariu.ro`) acts as a configuration proxy. It reads from Azure App Configuration + Key Vault (in Azure) or local config files (in local mode), caches values in-memory with configurable TTL, and exposes a REST API. Both the API and website fetch config through this service instead of directly from Azure. This enables config refresh without redeployment, true environment decoupling, and a single place to manage credentials.

**Tech Stack:** .NET 10 Minimal API, Azure App Configuration, Azure Key Vault, Azure Identity (DefaultAzureCredential), Next.js Server Actions, Docker, Bicep IaC

---

## Current State Analysis

### Problems Identified

1. **DefaultAzureCredential duplicated 15+ times** across 8 API source files and 7 website source files — each with the same `#if !DEBUG` / `AZURE_CLIENT_ID` pattern
2. **Hardcoded Azure endpoints** in `appsettings.Development.json` and `appsettings.Production.json` (`https://qpfnu3kv.vault.azure.net/`, `https://qpfnu3appconfig.azconfig.io`)
3. **Hardcoded hostname in `next.config.ts`** (`qpfnu3sacc.blob.core.windows.net`)
4. **No config caching in frontend** — `fetchConfigurationValue()` creates a new `AppConfigurationClient` on every call via a connection string (not even managed identity)
5. **No config refresh in frontend** — values are fetched once per Server Action call, no TTL or polling
6. **Frontend uses connection string** for App Config (`CONFIG_STORE`) instead of managed identity
7. **Config mapping uses reflection** in the API (`GetType().GetProperty().SetValue()`), which is fragile
8. **No local-mode config story for the frontend** — `CONFIG_STORE` is empty in dev `.env`

### Credential Duplication Map

**API (`sites/api.arolariu.ro/src/`):**
- `Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs:89`
- `Common/Services/KeyVault/KeyVaultService.cs`
- `Common/Telemetry/Tracing/TracingExtensions.cs`
- `Common/Telemetry/Metering/MeteringExtensions.cs`
- `Common/Telemetry/Logging/LoggingExtensions.cs`
- `Invoices/Brokers/AnalysisBrokers/ClassifierBroker/AzureOpenAiBroker.cs`
- `Invoices/Brokers/AnalysisBrokers/IdentifierBroker/AzureFormRecognizerBroker.cs`
- `Invoices/Modules/WebApplicationBuilderExtensions.cs`

**Website (`sites/arolariu.ro/src/`):**
- `lib/actions/storage/uploadBlob.ts`
- `lib/actions/storage/fetchBlob.ts`
- `lib/actions/scans/uploadScan.ts`
- `lib/actions/scans/fetchScans.ts`
- `lib/actions/scans/deleteScan.ts`
- `lib/actions/invoices/createInvoiceScan.ts`
- `instrumentation.server.ts`

---

## Phase 1: Centralize Azure Credentials (API)

### Task 1.1: Create AzureCredentialFactory

**Files:**
- Create: `sites/api.arolariu.ro/src/Common/Azure/AzureCredentialFactory.cs`
- Test: `sites/api.arolariu.ro/tests/Common/Azure/AzureCredentialFactoryTests.cs`

**Step 1: Write the failing test**

```csharp
// tests/Common/Azure/AzureCredentialFactoryTests.cs
namespace arolariu.Backend.Tests.Common.Azure;

using arolariu.Backend.Common.Azure;
using Azure.Identity;
using Xunit;

public class AzureCredentialFactoryTests
{
    [Fact]
    public void CreateCredential_ReturnsDefaultAzureCredential()
    {
        // Arrange & Act
        var credential = AzureCredentialFactory.CreateCredential();

        // Assert
        Assert.NotNull(credential);
        Assert.IsType<DefaultAzureCredential>(credential);
    }
}
```

**Step 2: Run test to verify it fails**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "AzureCredentialFactoryTests" -v n`
Expected: FAIL — `AzureCredentialFactory` does not exist

**Step 3: Write the implementation**

```csharp
// sites/api.arolariu.ro/src/Common/Azure/AzureCredentialFactory.cs
namespace arolariu.Backend.Common.Azure;

using System;
using global::Azure.Core;
using global::Azure.Identity;

/// <summary>
/// Centralized factory for creating Azure credentials.
/// Ensures consistent credential configuration across all Azure service clients.
/// </summary>
public static class AzureCredentialFactory
{
    private static readonly Lazy<TokenCredential> CachedCredential = new(CreateCredentialInternal);

    /// <summary>
    /// Creates a new <see cref="DefaultAzureCredential"/> configured for the current environment.
    /// In RELEASE builds, uses the AZURE_CLIENT_ID environment variable for User Assigned Managed Identity.
    /// In DEBUG builds, falls back to the default credential chain (Azure CLI, Visual Studio, etc.).
    /// </summary>
    /// <returns>A configured <see cref="TokenCredential"/> instance.</returns>
    public static TokenCredential CreateCredential() => CachedCredential.Value;

    private static DefaultAzureCredential CreateCredentialInternal()
    {
        return new DefaultAzureCredential(
#if !DEBUG
            new DefaultAzureCredentialOptions
            {
                ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
            }
#endif
        );
    }
}
```

**Step 4: Run test to verify it passes**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "AzureCredentialFactoryTests" -v n`
Expected: PASS

**Step 5: Commit**

```bash
git add sites/api.arolariu.ro/src/Common/Azure/AzureCredentialFactory.cs sites/api.arolariu.ro/tests/Common/Azure/AzureCredentialFactoryTests.cs
git commit -m "feat: add centralized AzureCredentialFactory for consistent credential management"
```

### Task 1.2: Replace all DefaultAzureCredential instantiations in API with AzureCredentialFactory

**Files:**
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs:89-96`
- Modify: `sites/api.arolariu.ro/src/Common/Services/KeyVault/KeyVaultService.cs`
- Modify: `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/TracingExtensions.cs`
- Modify: `sites/api.arolariu.ro/src/Common/Telemetry/Metering/MeteringExtensions.cs`
- Modify: `sites/api.arolariu.ro/src/Common/Telemetry/Logging/LoggingExtensions.cs`
- Modify: `sites/api.arolariu.ro/src/Invoices/Brokers/AnalysisBrokers/ClassifierBroker/AzureOpenAiBroker.cs`
- Modify: `sites/api.arolariu.ro/src/Invoices/Brokers/AnalysisBrokers/IdentifierBroker/AzureFormRecognizerBroker.cs`
- Modify: `sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs`

**Step 1: In each file, replace the credential creation block**

Replace this pattern (found in all 8 files):
```csharp
var credentials = new DefaultAzureCredential(
#if !DEBUG
    new DefaultAzureCredentialOptions
    {
        ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
    }
#endif
);
```

With:
```csharp
var credentials = AzureCredentialFactory.CreateCredential();
```

Add the import to each file:
```csharp
using arolariu.Backend.Common.Azure;
```

**Step 2: Build to verify compilation**

Run: `dotnet build sites/api.arolariu.ro/src/Core`
Expected: Build succeeded with 0 errors

**Step 3: Run all tests**

Run: `dotnet test sites/api.arolariu.ro/tests -v n`
Expected: All existing tests still pass

**Step 4: Commit**

```bash
git add -A sites/api.arolariu.ro/src/
git commit -m "refactor: replace 8 DefaultAzureCredential instantiations with AzureCredentialFactory"
```

---

## Phase 2: Remove Hardcoded Values (API)

### Task 2.1: Move Azure endpoints to environment variables

**Files:**
- Modify: `sites/api.arolariu.ro/src/Core/appsettings.Development.json`
- Modify: `sites/api.arolariu.ro/src/Core/appsettings.Production.json`
- Modify: `sites/api.arolariu.ro/src/Core/appsettings.json`
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs`

**Step 1: Update appsettings.Development.json**

Change from:
```json
{
  "ApplicationOptions": {
    "SecretsEndpoint": "https://qpfnu3kv.vault.azure.net/",
    "ConfigurationEndpoint": "https://qpfnu3appconfig.azconfig.io"
  }
}
```

To:
```json
{
  "ApplicationOptions": {
    "SecretsEndpoint": "",
    "ConfigurationEndpoint": ""
  }
}
```

**Step 2: Do the same for appsettings.Production.json**

Same change — empty strings. The actual values will come from environment variables or the config proxy.

**Step 3: Update WebApplicationBuilderExtensions.cs to read from env vars with appsettings fallback**

In `AddAzureConfiguration()`, update lines 98-99:
```csharp
var secretsStoreEndpoint = new Uri(
    Environment.GetEnvironmentVariable("AZURE_KEYVAULT_ENDPOINT")
    ?? configuration["ApplicationOptions:SecretsEndpoint"]
    ?? throw new InvalidOperationException("SecretsEndpoint not configured. Set AZURE_KEYVAULT_ENDPOINT env var."));

var configStoreEndpoint = new Uri(
    Environment.GetEnvironmentVariable("AZURE_APPCONFIG_ENDPOINT")
    ?? configuration["ApplicationOptions:ConfigurationEndpoint"]
    ?? throw new InvalidOperationException("ConfigurationEndpoint not configured. Set AZURE_APPCONFIG_ENDPOINT env var."));
```

**Step 4: Update the Dockerfile to pass these env vars**

Verify that `sites/api.arolariu.ro/Dockerfile` already passes `AZURE_KEYVAULT_ENDPOINT` and `AZURE_APPCONFIG_ENDPOINT` as build args or runtime env vars. If not, add them.

**Step 5: Build and test**

Run: `dotnet build sites/api.arolariu.ro/src/Core`
Expected: Build succeeded

**Step 6: Commit**

```bash
git add sites/api.arolariu.ro/src/Core/
git commit -m "refactor: remove hardcoded Azure endpoints from appsettings, use env vars"
```

### Task 2.2: Replace reflection-based config mapping with strongly-typed binding

**Files:**
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs:138-165`

**Step 1: Replace the reflection-based mapping**

Replace lines 138-165:
```csharp
services.Configure<AzureOptions>(options =>
{
    options.SecretsEndpoint = secretsStoreEndpoint.ToString();
    options.ConfigurationEndpoint = configStoreEndpoint.ToString();

    var configMappings = new Dictionary<string, string>
    {
        { nameof(options.JwtSecret), "Common:Auth:Secret" },
        // ... more mappings
    };

    foreach (var mapping in configMappings)
    {
        if (configStoreConfigurationProvider[mapping.Value] is string value)
        {
            options.GetType().GetProperty(mapping.Key)?.SetValue(options, value);
        }
    }
});
```

With direct property assignment (no reflection):
```csharp
services.Configure<AzureOptions>(options =>
{
    options.SecretsEndpoint = secretsStoreEndpoint.ToString();
    options.ConfigurationEndpoint = configStoreEndpoint.ToString();
    options.JwtSecret = configStoreConfigurationProvider["Common:Auth:Secret"] ?? string.Empty;
    options.JwtIssuer = configStoreConfigurationProvider["Common:Auth:Issuer"] ?? string.Empty;
    options.JwtAudience = configStoreConfigurationProvider["Common:Auth:Audience"] ?? string.Empty;
    options.TenantId = configStoreConfigurationProvider["Common:Azure:TenantId"] ?? string.Empty;
    options.OpenAIEndpoint = configStoreConfigurationProvider["Endpoints:OpenAI"] ?? string.Empty;
    options.SqlConnectionString = configStoreConfigurationProvider["Endpoints:SqlServer"] ?? string.Empty;
    options.NoSqlConnectionString = configStoreConfigurationProvider["Endpoints:NoSqlServer"] ?? string.Empty;
    options.StorageAccountEndpoint = configStoreConfigurationProvider["Endpoints:StorageAccount"] ?? string.Empty;
    options.ApplicationInsightsEndpoint = configStoreConfigurationProvider["Endpoints:ApplicationInsights"] ?? string.Empty;
    options.CognitiveServicesEndpoint = configStoreConfigurationProvider["Endpoints:CognitiveServices"] ?? string.Empty;
    options.CognitiveServicesKey = configStoreConfigurationProvider["Endpoints:CognitiveServices:Key"] ?? string.Empty;
});
```

**Step 2: Build and test**

Run: `dotnet build sites/api.arolariu.ro/src/Core && dotnet test sites/api.arolariu.ro/tests -v n`
Expected: Build succeeded, all tests pass

**Step 3: Commit**

```bash
git add sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs
git commit -m "refactor: replace reflection-based config mapping with direct property assignment"
```

---

## Phase 3: Centralize Azure Credentials (Website)

### Task 3.1: Create azureCredentials.ts utility

**Files:**
- Create: `sites/arolariu.ro/src/lib/azure/credentials.ts`
- Test: `sites/arolariu.ro/src/lib/azure/credentials.test.ts`

**Step 1: Write the failing test**

```typescript
// sites/arolariu.ro/src/lib/azure/credentials.test.ts
import {describe, it, expect} from "vitest";

describe("Azure Credentials", () => {
  it("getAzureCredential returns a DefaultAzureCredential instance", async () => {
    const {getAzureCredential} = await import("./credentials");
    const credential = getAzureCredential();
    expect(credential).toBeDefined();
    expect(credential).toHaveProperty("getToken");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/azure/credentials.test.ts --config sites/arolariu.ro/vitest.config.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// sites/arolariu.ro/src/lib/azure/credentials.ts
/**
 * @fileoverview Centralized Azure credential management for the frontend.
 * @module sites/arolariu.ro/src/lib/azure/credentials
 */

"use server";

import {DefaultAzureCredential} from "@azure/identity";
import type {TokenCredential} from "@azure/identity";

let cachedCredential: TokenCredential | null = null;

/**
 * Returns a singleton DefaultAzureCredential instance.
 * In production, uses AZURE_CLIENT_ID for User Assigned Managed Identity.
 * In development, falls back to Azure CLI / environment credentials.
 */
export function getAzureCredential(): TokenCredential {
  if (!cachedCredential) {
    const clientId = process.env["AZURE_CLIENT_ID"];
    cachedCredential = clientId
      ? new DefaultAzureCredential({managedIdentityClientId: clientId})
      : new DefaultAzureCredential();
  }
  return cachedCredential;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/azure/credentials.test.ts --config sites/arolariu.ro/vitest.config.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/lib/azure/credentials.ts sites/arolariu.ro/src/lib/azure/credentials.test.ts
git commit -m "feat: add centralized Azure credential factory for frontend"
```

### Task 3.2: Replace all DefaultAzureCredential instantiations in website with getAzureCredential()

**Files:**
- Modify: `sites/arolariu.ro/src/lib/actions/storage/uploadBlob.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/storage/fetchBlob.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/scans/uploadScan.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/scans/fetchScans.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/scans/deleteScan.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/invoices/createInvoiceScan.ts`
- Modify: `sites/arolariu.ro/src/instrumentation.server.ts`

**Step 1: In each file, replace credential creation**

Replace:
```typescript
import {DefaultAzureCredential} from "@azure/identity";
// ...
const credentials = new DefaultAzureCredential();
// or
const credentials = new DefaultAzureCredential({managedIdentityClientId: process.env["AZURE_CLIENT_ID"]});
```

With:
```typescript
import {getAzureCredential} from "@/lib/azure/credentials";
// ...
const credentials = getAzureCredential();
```

**Step 2: Run lint and build**

Run: `npm run lint --workspace=sites/arolariu.ro && npm run build:website`
Expected: No errors

**Step 3: Run tests**

Run: `npm run test:website`
Expected: All tests pass

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/
git commit -m "refactor: replace 7 DefaultAzureCredential instantiations with getAzureCredential()"
```

---

## Phase 4: Build experiments.arolariu.ro Config Proxy Service

### Task 4.1: Scaffold the .NET 10 Minimal API project

**Files:**
- Create: `sites/experiments.arolariu.ro/` (new project directory)

**Step 1: Create the project**

```bash
cd sites
dotnet new web -n experiments.arolariu.ro --framework net10.0
cd experiments.arolariu.ro
dotnet add package Azure.Identity
dotnet add package Microsoft.Extensions.Configuration.AzureAppConfiguration
dotnet add package Azure.Extensions.AspNetCore.Configuration.Secrets
dotnet add package Azure.Security.KeyVault.Secrets
```

**Step 2: Verify build**

Run: `dotnet build sites/experiments.arolariu.ro`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add sites/experiments.arolariu.ro/
git commit -m "feat: scaffold experiments.arolariu.ro config proxy service"
```

### Task 4.2: Implement the configuration loading pipeline

**Files:**
- Modify: `sites/experiments.arolariu.ro/Program.cs`
- Create: `sites/experiments.arolariu.ro/ConfigurationContracts.cs`

**Step 1: Define the response contract**

```csharp
// sites/experiments.arolariu.ro/ConfigurationContracts.cs
namespace experiments.arolariu.ro;

/// <summary>Response for a single configuration value.</summary>
public sealed record ConfigValueResponse(string Key, string Value, DateTime FetchedAt);

/// <summary>Response for multiple configuration values.</summary>
public sealed record ConfigBatchResponse(IReadOnlyList<ConfigValueResponse> Values, DateTime FetchedAt);

/// <summary>Health check response.</summary>
public sealed record HealthResponse(string Status, string Environment, DateTime Timestamp);
```

**Step 2: Implement Program.cs with config loading and caching**

```csharp
// sites/experiments.arolariu.ro/Program.cs
using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Configuration.AzureAppConfiguration;
using experiments.arolariu.ro;

var builder = WebApplication.CreateBuilder(args);

var infrastructure = Environment.GetEnvironmentVariable("INFRA") ?? "local";
var environment = builder.Environment.EnvironmentName;

IConfigurationRoot? appConfigProvider = null;

if (infrastructure == "azure")
{
    var credentials = new DefaultAzureCredential(
        Environment.GetEnvironmentVariable("AZURE_CLIENT_ID") is string clientId
            ? new DefaultAzureCredentialOptions { ManagedIdentityClientId = clientId }
            : new DefaultAzureCredentialOptions());

    var configEndpoint = Environment.GetEnvironmentVariable("AZURE_APPCONFIG_ENDPOINT")
        ?? throw new InvalidOperationException("AZURE_APPCONFIG_ENDPOINT required in azure mode");

    var kvEndpoint = Environment.GetEnvironmentVariable("AZURE_KEYVAULT_ENDPOINT")
        ?? throw new InvalidOperationException("AZURE_KEYVAULT_ENDPOINT required in azure mode");

    var label = environment == "Production" ? "PRODUCTION" : "DEVELOPMENT";

    appConfigProvider = new ConfigurationBuilder()
        .AddAzureAppConfiguration(config =>
        {
            config.Connect(new Uri(configEndpoint), credentials);
            config.Select("*", labelFilter: label);
            config.ConfigureKeyVault(kv =>
            {
                kv.SetCredential(credentials);
                kv.SetSecretRefreshInterval(TimeSpan.FromMinutes(15));
            });
            config.ConfigureRefresh(refresh =>
            {
                refresh.RegisterAll();
                refresh.SetRefreshInterval(TimeSpan.FromMinutes(5));
            });
        })
        .AddAzureKeyVault(
            new Uri(kvEndpoint),
            credentials,
            new Azure.Extensions.AspNetCore.Configuration.Secrets.AzureKeyVaultConfigurationOptions
            {
                ReloadInterval = TimeSpan.FromMinutes(15)
            })
        .Build();
}
else
{
    // Local mode: read from appsettings.json / env vars
    appConfigProvider = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", optional: true)
        .AddJsonFile($"appsettings.{environment}.json", optional: true)
        .AddEnvironmentVariables()
        .Build();
}

builder.Services.AddSingleton<IConfiguration>(appConfigProvider);
builder.Services.AddHealthChecks();

var app = builder.Build();

// GET /health
app.MapHealthChecks("/health");
app.MapGet("/", () => new HealthResponse("Healthy", infrastructure, DateTime.UtcNow));

// GET /config/{key} - Get a single config value
app.MapGet("/config/{*key}", (string key, IConfiguration config) =>
{
    var value = config[key];
    return value is not null
        ? Results.Ok(new ConfigValueResponse(key, value, DateTime.UtcNow))
        : Results.NotFound(new { error = $"Key '{key}' not found" });
});

// GET /config?keys=key1,key2,key3 - Get multiple config values
app.MapGet("/config", (string? keys, string? prefix, IConfiguration config) =>
{
    if (keys is not null)
    {
        var keyList = keys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var values = keyList
            .Select(k => new ConfigValueResponse(k, config[k] ?? string.Empty, DateTime.UtcNow))
            .ToList();
        return Results.Ok(new ConfigBatchResponse(values, DateTime.UtcNow));
    }

    if (prefix is not null)
    {
        var section = config.GetSection(prefix);
        var values = section.GetChildren()
            .Select(c => new ConfigValueResponse($"{prefix}:{c.Key}", c.Value ?? string.Empty, DateTime.UtcNow))
            .ToList();
        return Results.Ok(new ConfigBatchResponse(values, DateTime.UtcNow));
    }

    return Results.BadRequest(new { error = "Provide 'keys' or 'prefix' query parameter" });
});

app.Run();
```

**Step 3: Add appsettings.json for local mode**

```json
{
  "Logging": {
    "LogLevel": { "Default": "Information" }
  },
  "AllowedHosts": "*",
  "Common:Auth:Secret": "local-dev-jwt-secret-at-least-32-characters-long",
  "Common:Auth:Issuer": "https://localhost:5000",
  "Common:Auth:Audience": "https://localhost:3000",
  "Endpoints:StorageAccount": "http://127.0.0.1:10000/devstoreaccount1",
  "Endpoints:SqlServer": "Server=localhost,8082;Database=arolariu;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true;",
  "Endpoints:NoSqlServer": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==;",
  "Endpoints:ApplicationInsights": "",
  "Endpoints:OpenAI": "",
  "Endpoints:CognitiveServices": "",
  "Endpoints:CognitiveServices:Key": "",
  "AzureOptions:StorageAccountEndpoint": "http://127.0.0.1:10000/devstoreaccount1"
}
```

**Step 4: Build and verify**

Run: `dotnet build sites/experiments.arolariu.ro`
Expected: Build succeeded

**Step 5: Commit**

```bash
git add sites/experiments.arolariu.ro/
git commit -m "feat: implement config proxy REST API with Azure/local mode support"
```

### Task 4.3: Add Dockerfile for experiments.arolariu.ro

**Files:**
- Create: `sites/experiments.arolariu.ro/Dockerfile`

**Step 1: Write the Dockerfile**

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["experiments.arolariu.ro.csproj", "."]
RUN dotnet restore
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "experiments.arolariu.ro.dll"]
```

**Step 2: Build Docker image locally**

Run: `docker build -t experiments-arolariu-ro sites/experiments.arolariu.ro/`
Expected: Image built successfully

**Step 3: Commit**

```bash
git add sites/experiments.arolariu.ro/Dockerfile
git commit -m "feat: add Dockerfile for experiments.arolariu.ro config proxy"
```

### Task 4.4: Add experiments service to local Docker Compose

**Files:**
- Modify: `infra/Local/Storage/docker-compose.yml`

**Step 1: Add the experiments service**

Add this service to the docker-compose file:

```yaml
  experiments:
    build:
      context: ../../../sites/experiments.arolariu.ro
      dockerfile: Dockerfile
    container_name: experiments-arolariu-ro
    ports:
      - "5002:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - INFRA=local
    networks:
      - arolariu-network
    depends_on:
      - mssql
      - cosmosdb
      - azurite
```

**Step 2: Test locally**

Run: `docker compose -f infra/Local/Storage/docker-compose.yml up experiments -d`
Verify: `curl http://localhost:5002/health`
Expected: `{"status":"Healthy","environment":"local","timestamp":"..."}`

**Step 3: Commit**

```bash
git add infra/Local/Storage/docker-compose.yml
git commit -m "feat: add experiments.arolariu.ro to local Docker Compose"
```

---

## Phase 5: Config Client for API

### Task 5.1: Create ConfigProxyClient for .NET

**Files:**
- Create: `sites/api.arolariu.ro/src/Common/Configuration/ConfigProxyClient.cs`
- Create: `sites/api.arolariu.ro/src/Common/Configuration/IConfigProxyClient.cs`
- Test: `sites/api.arolariu.ro/tests/Common/Configuration/ConfigProxyClientTests.cs`

**Step 1: Define the interface**

```csharp
// sites/api.arolariu.ro/src/Common/Configuration/IConfigProxyClient.cs
namespace arolariu.Backend.Common.Configuration;

/// <summary>
/// Client for fetching configuration values from the experiments.arolariu.ro config proxy.
/// </summary>
public interface IConfigProxyClient
{
    /// <summary>Fetches a single configuration value by key.</summary>
    Task<string?> GetValueAsync(string key, CancellationToken ct = default);

    /// <summary>Fetches multiple configuration values by keys.</summary>
    Task<IReadOnlyDictionary<string, string>> GetValuesAsync(IEnumerable<string> keys, CancellationToken ct = default);

    /// <summary>Fetches all configuration values with a given prefix.</summary>
    Task<IReadOnlyDictionary<string, string>> GetValuesByPrefixAsync(string prefix, CancellationToken ct = default);
}
```

**Step 2: Write the failing test**

```csharp
// tests/Common/Configuration/ConfigProxyClientTests.cs
namespace arolariu.Backend.Tests.Common.Configuration;

using System.Net;
using System.Net.Http;
using System.Text.Json;
using arolariu.Backend.Common.Configuration;
using Xunit;

public class ConfigProxyClientTests
{
    [Fact]
    public async Task GetValueAsync_ReturnsValue_WhenKeyExists()
    {
        // Arrange
        var handler = new MockHttpMessageHandler(new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonSerializer.Serialize(new { Key = "test:key", Value = "test-value", FetchedAt = DateTime.UtcNow }))
        });
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5002") };
        var client = new ConfigProxyClient(httpClient);

        // Act
        var result = await client.GetValueAsync("test:key");

        // Assert
        Assert.Equal("test-value", result);
    }
}

// Simple mock handler for testing
internal class MockHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        => Task.FromResult(response);
}
```

**Step 3: Run test to verify it fails**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "ConfigProxyClientTests" -v n`
Expected: FAIL — `ConfigProxyClient` does not exist

**Step 4: Implement the client**

```csharp
// sites/api.arolariu.ro/src/Common/Configuration/ConfigProxyClient.cs
namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// HTTP client for the experiments.arolariu.ro configuration proxy service.
/// </summary>
public sealed class ConfigProxyClient(HttpClient httpClient) : IConfigProxyClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    /// <inheritdoc />
    public async Task<string?> GetValueAsync(string key, CancellationToken ct = default)
    {
        var response = await httpClient.GetAsync($"/config/{key}", ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode) return null;

        var result = await response.Content.ReadFromJsonAsync<ConfigValueDto>(JsonOptions, ct).ConfigureAwait(false);
        return result?.Value;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyDictionary<string, string>> GetValuesAsync(IEnumerable<string> keys, CancellationToken ct = default)
    {
        var keysParam = string.Join(",", keys);
        var response = await httpClient.GetAsync($"/config?keys={Uri.EscapeDataString(keysParam)}", ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode) return new Dictionary<string, string>();

        var result = await response.Content.ReadFromJsonAsync<ConfigBatchDto>(JsonOptions, ct).ConfigureAwait(false);
        return result?.Values.ToDictionary(v => v.Key, v => v.Value) ?? new Dictionary<string, string>();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyDictionary<string, string>> GetValuesByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        var response = await httpClient.GetAsync($"/config?prefix={Uri.EscapeDataString(prefix)}", ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode) return new Dictionary<string, string>();

        var result = await response.Content.ReadFromJsonAsync<ConfigBatchDto>(JsonOptions, ct).ConfigureAwait(false);
        return result?.Values.ToDictionary(v => v.Key, v => v.Value) ?? new Dictionary<string, string>();
    }

    private sealed record ConfigValueDto(string Key, string Value, DateTime FetchedAt);
    private sealed record ConfigBatchDto(IReadOnlyList<ConfigValueDto> Values, DateTime FetchedAt);
}
```

**Step 5: Run test to verify it passes**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "ConfigProxyClientTests" -v n`
Expected: PASS

**Step 6: Commit**

```bash
git add sites/api.arolariu.ro/src/Common/Configuration/ sites/api.arolariu.ro/tests/Common/Configuration/
git commit -m "feat: add ConfigProxyClient for experiments.arolariu.ro communication"
```

### Task 5.2: Register ConfigProxyClient in DI and wire into AddAzureConfiguration

**Files:**
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs`

**Step 1: Add a new infrastructure mode "proxy" alongside "azure" and "local"**

Update the `AddGeneralDomainConfiguration` method to support three infrastructure modes:

```csharp
switch (infrastructure)
{
    case "azure":
        AddAzureConfiguration(builder);
        break;
    case "proxy":
        AddProxyConfiguration(builder);
        break;
    case "local":
        AddLocalConfiguration(builder);
        break;
    default:
        throw new ArgumentException("The `INFRA` env. var. must be 'azure', 'proxy', or 'local'.");
}
```

**Step 2: Add the proxy configuration method**

```csharp
private static void AddProxyConfiguration(this WebApplicationBuilder builder)
{
    var services = builder.Services;
    var proxyUrl = Environment.GetEnvironmentVariable("CONFIG_PROXY_URL")
        ?? "http://localhost:5002";

    services.AddHttpClient<IConfigProxyClient, ConfigProxyClient>(client =>
    {
        client.BaseAddress = new Uri(proxyUrl);
        client.Timeout = TimeSpan.FromSeconds(30);
    });

    // Fetch config from proxy at startup, populate IOptionsMonitor
    using var tempProvider = services.BuildServiceProvider();
    var proxyClient = tempProvider.GetRequiredService<IConfigProxyClient>();
    var configValues = proxyClient.GetValuesAsync(new[]
    {
        "Common:Auth:Secret", "Common:Auth:Issuer", "Common:Auth:Audience",
        "Common:Azure:TenantId", "Endpoints:OpenAI", "Endpoints:SqlServer",
        "Endpoints:NoSqlServer", "Endpoints:StorageAccount",
        "Endpoints:ApplicationInsights", "Endpoints:CognitiveServices",
        "Endpoints:CognitiveServices:Key"
    }).GetAwaiter().GetResult();

    services.AddSingleton<IOptionsManager, CloudOptionsManager>();
    services.Configure<AzureOptions>(options =>
    {
        options.SecretsEndpoint = Environment.GetEnvironmentVariable("AZURE_KEYVAULT_ENDPOINT") ?? string.Empty;
        options.ConfigurationEndpoint = Environment.GetEnvironmentVariable("AZURE_APPCONFIG_ENDPOINT") ?? string.Empty;
        options.JwtSecret = configValues.GetValueOrDefault("Common:Auth:Secret", string.Empty);
        options.JwtIssuer = configValues.GetValueOrDefault("Common:Auth:Issuer", string.Empty);
        options.JwtAudience = configValues.GetValueOrDefault("Common:Auth:Audience", string.Empty);
        options.TenantId = configValues.GetValueOrDefault("Common:Azure:TenantId", string.Empty);
        options.OpenAIEndpoint = configValues.GetValueOrDefault("Endpoints:OpenAI", string.Empty);
        options.SqlConnectionString = configValues.GetValueOrDefault("Endpoints:SqlServer", string.Empty);
        options.NoSqlConnectionString = configValues.GetValueOrDefault("Endpoints:NoSqlServer", string.Empty);
        options.StorageAccountEndpoint = configValues.GetValueOrDefault("Endpoints:StorageAccount", string.Empty);
        options.ApplicationInsightsEndpoint = configValues.GetValueOrDefault("Endpoints:ApplicationInsights", string.Empty);
        options.CognitiveServicesEndpoint = configValues.GetValueOrDefault("Endpoints:CognitiveServices", string.Empty);
        options.CognitiveServicesKey = configValues.GetValueOrDefault("Endpoints:CognitiveServices:Key", string.Empty);
    });
}
```

**Step 3: Build and test**

Run: `dotnet build sites/api.arolariu.ro/src/Core`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs
git commit -m "feat: add 'proxy' infrastructure mode for config proxy integration"
```

### Task 5.3: Add background config refresh via HostedService

**Files:**
- Create: `sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs`

**Step 1: Implement the background refresh service**

```csharp
// sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs
namespace arolariu.Backend.Common.Configuration;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Background service that periodically refreshes configuration from the config proxy.
/// </summary>
public sealed class ConfigRefreshHostedService(
    IServiceProvider serviceProvider,
    IOptionsMonitor<AzureOptions> optionsMonitor,
    ILogger<ConfigRefreshHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(5);

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(RefreshInterval, stoppingToken).ConfigureAwait(false);

            try
            {
                using var scope = serviceProvider.CreateScope();
                var proxyClient = scope.ServiceProvider.GetRequiredService<IConfigProxyClient>();
                var configValues = await proxyClient.GetValuesAsync(new[]
                {
                    "Common:Auth:Secret", "Common:Auth:Issuer", "Common:Auth:Audience",
                    "Common:Azure:TenantId", "Endpoints:OpenAI", "Endpoints:SqlServer",
                    "Endpoints:NoSqlServer", "Endpoints:StorageAccount",
                    "Endpoints:ApplicationInsights", "Endpoints:CognitiveServices",
                    "Endpoints:CognitiveServices:Key"
                }, stoppingToken).ConfigureAwait(false);

                // Update the options through the monitor
                var currentOptions = optionsMonitor.CurrentValue;
                currentOptions.JwtSecret = configValues.GetValueOrDefault("Common:Auth:Secret", currentOptions.JwtSecret);
                currentOptions.JwtIssuer = configValues.GetValueOrDefault("Common:Auth:Issuer", currentOptions.JwtIssuer);
                currentOptions.JwtAudience = configValues.GetValueOrDefault("Common:Auth:Audience", currentOptions.JwtAudience);
                currentOptions.OpenAIEndpoint = configValues.GetValueOrDefault("Endpoints:OpenAI", currentOptions.OpenAIEndpoint);
                currentOptions.SqlConnectionString = configValues.GetValueOrDefault("Endpoints:SqlServer", currentOptions.SqlConnectionString);
                currentOptions.NoSqlConnectionString = configValues.GetValueOrDefault("Endpoints:NoSqlServer", currentOptions.NoSqlConnectionString);
                currentOptions.StorageAccountEndpoint = configValues.GetValueOrDefault("Endpoints:StorageAccount", currentOptions.StorageAccountEndpoint);
                currentOptions.ApplicationInsightsEndpoint = configValues.GetValueOrDefault("Endpoints:ApplicationInsights", currentOptions.ApplicationInsightsEndpoint);
                currentOptions.CognitiveServicesEndpoint = configValues.GetValueOrDefault("Endpoints:CognitiveServices", currentOptions.CognitiveServicesEndpoint);
                currentOptions.CognitiveServicesKey = configValues.GetValueOrDefault("Endpoints:CognitiveServices:Key", currentOptions.CognitiveServicesKey);

                logger.LogInformation("Configuration refreshed successfully from config proxy at {Timestamp}", DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to refresh configuration from config proxy. Retrying in {Interval}.", RefreshInterval);
            }
        }
    }
}
```

**Step 2: Register in the proxy configuration method**

Add to `AddProxyConfiguration()`:
```csharp
services.AddHostedService<ConfigRefreshHostedService>();
```

**Step 3: Build and test**

Run: `dotnet build sites/api.arolariu.ro/src/Core`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs
git commit -m "feat: add background config refresh hosted service for proxy mode"
```

---

## Phase 6: Config Client for Website (Next.js)

### Task 6.1: Create configProxy.ts service with in-memory caching

**Files:**
- Create: `sites/arolariu.ro/src/lib/config/configProxy.ts`
- Test: `sites/arolariu.ro/src/lib/config/configProxy.test.ts`

**Step 1: Write the failing test**

```typescript
// sites/arolariu.ro/src/lib/config/configProxy.test.ts
import {describe, it, expect, vi, beforeEach} from "vitest";

describe("ConfigProxy", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("fetchConfigValue returns cached value on second call", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({Key: "test:key", Value: "test-value", FetchedAt: new Date().toISOString()}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const {fetchConfigValue} = await import("./configProxy");
    const value1 = await fetchConfigValue("test:key");
    const value2 = await fetchConfigValue("test:key");

    expect(value1).toBe("test-value");
    expect(value2).toBe("test-value");
    expect(mockFetch).toHaveBeenCalledTimes(1); // Cached on second call
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/config/configProxy.test.ts --config sites/arolariu.ro/vitest.config.ts`
Expected: FAIL — module not found

**Step 3: Implement the config proxy client with TTL cache**

```typescript
// sites/arolariu.ro/src/lib/config/configProxy.ts
/**
 * @fileoverview Configuration proxy client with in-memory caching and TTL-based refresh.
 * Replaces direct Azure App Configuration access with HTTP calls to experiments.arolariu.ro.
 * @module sites/arolariu.ro/src/lib/config/configProxy
 */

"use server";

const CONFIG_PROXY_URL = process.env["CONFIG_PROXY_URL"] ?? "http://localhost:5002";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Fetches a single configuration value from the config proxy with TTL caching.
 * Values are cached for 5 minutes before being re-fetched.
 * @param key - The configuration key to fetch
 * @returns The configuration value, or empty string if not found
 */
export async function fetchConfigValue(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const response = await fetch(`${CONFIG_PROXY_URL}/config/${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return cached?.value ?? "";

    const data = (await response.json()) as {Key: string; Value: string; FetchedAt: string};
    cache.set(key, {value: data.Value, fetchedAt: Date.now()});
    return data.Value;
  } catch {
    // Return stale cached value on error, or empty string
    return cached?.value ?? "";
  }
}

/**
 * Fetches multiple configuration values from the config proxy.
 * @param keys - Array of configuration keys to fetch
 * @returns Map of key to value
 */
export async function fetchConfigValues(keys: string[]): Promise<Record<string, string>> {
  // Check cache first
  const uncachedKeys: string[] = [];
  const result: Record<string, string> = {};

  for (const key of keys) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      result[key] = cached.value;
    } else {
      uncachedKeys.push(key);
    }
  }

  if (uncachedKeys.length === 0) return result;

  try {
    const keysParam = uncachedKeys.map(encodeURIComponent).join(",");
    const response = await fetch(`${CONFIG_PROXY_URL}/config?keys=${keysParam}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      const data = (await response.json()) as {Values: Array<{Key: string; Value: string}>};
      for (const item of data.Values) {
        cache.set(item.Key, {value: item.Value, fetchedAt: Date.now()});
        result[item.Key] = item.Value;
      }
    }
  } catch {
    // Return whatever we have (cached or empty)
    for (const key of uncachedKeys) {
      const cached = cache.get(key);
      result[key] = cached?.value ?? "";
    }
  }

  return result;
}

/**
 * Invalidates the cache for a specific key or all keys.
 * Useful for forcing a refresh after known config changes.
 */
export function invalidateConfigCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/config/configProxy.test.ts --config sites/arolariu.ro/vitest.config.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/lib/config/
git commit -m "feat: add config proxy client with TTL caching for frontend"
```

### Task 6.2: Replace fetchConfigurationValue with configProxy in all server actions

**Files:**
- Modify: `sites/arolariu.ro/src/lib/actions/storage/fetchConfig.ts` (deprecate or redirect)
- Modify: `sites/arolariu.ro/src/lib/actions/storage/uploadBlob.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/storage/fetchBlob.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/scans/uploadScan.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/scans/fetchScans.ts`
- Modify: `sites/arolariu.ro/src/lib/actions/scans/deleteScan.ts`

**Step 1: Update fetchConfig.ts to use the proxy**

```typescript
// sites/arolariu.ro/src/lib/actions/storage/fetchConfig.ts
"use server";

import {fetchConfigValue} from "@/lib/config/configProxy";

/**
 * Server action that fetches a configuration value.
 * Delegates to the config proxy service for centralized configuration management.
 * @param key - The key of the configuration value to fetch.
 * @returns The value of the configuration, or empty string.
 */
export default async function fetchConfigurationValue(key: string): Promise<string> {
  return fetchConfigValue(key);
}
```

**Step 2: Build and run tests**

Run: `npm run build:website && npm run test:website`
Expected: Build succeeds, all tests pass

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/lib/actions/storage/fetchConfig.ts
git commit -m "refactor: redirect fetchConfigurationValue through config proxy service"
```

### Task 6.3: Remove hardcoded blob storage hostname from next.config.ts

**Files:**
- Modify: `sites/arolariu.ro/next.config.ts:65`

**Step 1: Replace hardcoded hostname with env var**

Change:
```typescript
{protocol: "https", hostname: "qpfnu3sacc.blob.core.windows.net"},
```

To:
```typescript
...(process.env["AZURE_STORAGE_HOSTNAME"]
  ? [{protocol: "https" as const, hostname: process.env["AZURE_STORAGE_HOSTNAME"]}]
  : []),
```

**Step 2: Add the env var to .env and .env.example**

Add: `AZURE_STORAGE_HOSTNAME=qpfnu3sacc.blob.core.windows.net`

**Step 3: Build to verify**

Run: `npm run build:website`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add sites/arolariu.ro/next.config.ts sites/arolariu.ro/.env sites/arolariu.ro/.env.example
git commit -m "refactor: replace hardcoded blob storage hostname with env var in next.config.ts"
```

---

## Phase 7: Infrastructure (Bicep)

### Task 7.1: Add experiments.arolariu.ro to Bicep deployment

**Files:**
- Create: `infra/Azure/Bicep/sites/experiments.bicep`
- Modify: `infra/Azure/Bicep/sites/deploymentFile.bicep`
- Modify: `infra/Azure/Bicep/facade.bicep`

**Step 1: Create the Bicep module for experiments site**

```bicep
// infra/Azure/Bicep/sites/experiments.bicep
metadata description = 'Deploys the experiments.arolariu.ro configuration proxy service.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the resources.')
param resourceLocation string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The resource convention prefix.')
param resourceConventionPrefix string

@description('The App Service Plan ID to deploy on.')
param appServicePlanId string

@description('The backend managed identity resource ID.')
param backendIdentityResourceId string

@description('The backend managed identity client ID.')
param backendIdentityClientId string

resource experimentsWebApp 'Microsoft.Web/sites@2024-04-01' = {
  name: 'experiments-arolariu-ro'
  location: resourceLocation
  kind: 'app,linux,container'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${backendIdentityResourceId}': {}
    }
  }
  tags: {
    environment: 'PRODUCTION'
    deploymentType: 'Bicep'
    deploymentDate: resourceDeploymentDate
    module: 'sites'
    costCenter: 'infrastructure'
    project: 'arolariu.ro'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      alwaysOn: false // Low traffic service, save costs
      linuxFxVersion: 'DOCKER|experiments-arolariu-ro:latest'
      appSettings: [
        { name: 'AZURE_CLIENT_ID', value: backendIdentityClientId }
        { name: 'INFRA', value: 'azure' }
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
        { name: 'AZURE_APPCONFIG_ENDPOINT', value: 'https://${resourceConventionPrefix}appconfig.azconfig.io' }
        { name: 'AZURE_KEYVAULT_ENDPOINT', value: 'https://${resourceConventionPrefix}kv.vault.azure.net/' }
      ]
    }
  }
}

output experimentsSiteId string = experimentsWebApp.id
output experimentsSiteName string = experimentsWebApp.name
output experimentsSiteDefaultHostname string = experimentsWebApp.properties.defaultHostName
```

**Step 2: Wire into the facade**

Add the experiments module deployment to `facade.bicep` in the Sites section.

**Step 3: Add RBAC for the experiments identity**

The experiments service uses the backend UAMI. Ensure App Configuration Data Reader and Key Vault Secrets User roles are assigned (they likely already are for the backend identity).

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/sites/experiments.bicep infra/Azure/Bicep/sites/deploymentFile.bicep infra/Azure/Bicep/facade.bicep
git commit -m "feat: add experiments.arolariu.ro Bicep deployment module"
```

### Task 7.2: Add CONFIG_PROXY_URL to API and Website app settings in Bicep

**Files:**
- Modify: `infra/Azure/Bicep/sites/deploymentFile.bicep` (or the individual site bicep files)

**Step 1: Add CONFIG_PROXY_URL app setting to both API and Website deployments**

For the API site:
```bicep
{ name: 'CONFIG_PROXY_URL', value: 'https://experiments-arolariu-ro.azurewebsites.net' }
{ name: 'INFRA', value: 'proxy' }  // Switch from 'azure' to 'proxy' mode
```

For the Website site:
```bicep
{ name: 'CONFIG_PROXY_URL', value: 'https://experiments-arolariu-ro.azurewebsites.net' }
```

**Step 2: Commit**

```bash
git add infra/Azure/Bicep/sites/
git commit -m "feat: add CONFIG_PROXY_URL to API and Website Bicep app settings"
```

---

## Phase 8: Local Development Story

### Task 8.1: Update .env files for local proxy mode

**Files:**
- Modify: `sites/arolariu.ro/.env`
- Modify: `sites/arolariu.ro/.env.example`
- Modify: `sites/api.arolariu.ro/src/Core/appsettings.Development.json`

**Step 1: Add CONFIG_PROXY_URL to frontend .env**

```
CONFIG_PROXY_URL=http://localhost:5002
```

**Step 2: Update API appsettings for local proxy support**

The API already supports `INFRA=local`. For proxy mode, set `INFRA=proxy` and `CONFIG_PROXY_URL=http://localhost:5002`.

Document in a comment or README that developers can choose:
- `INFRA=local` — reads config from local appsettings files (no experiments service needed)
- `INFRA=proxy` — reads config from experiments.arolariu.ro (run it via Docker Compose)
- `INFRA=azure` — reads config directly from Azure services (needs Azure credentials)

**Step 3: Commit**

```bash
git add sites/arolariu.ro/.env sites/arolariu.ro/.env.example
git commit -m "feat: add CONFIG_PROXY_URL to frontend environment configuration"
```

### Task 8.2: Update generate.env.ts script for new env vars

**Files:**
- Modify: `scripts/generate.env.ts`

**Step 1: Add the new environment variables to the generation script**

Add these entries to the env generation:
```typescript
// Configuration proxy
CONFIG_PROXY_URL: "http://localhost:5002",
AZURE_STORAGE_HOSTNAME: "", // Filled by App Configuration in production
```

**Step 2: Test the script**

Run: `npm run generate`
Expected: Script completes successfully, .env includes new vars

**Step 3: Commit**

```bash
git add scripts/generate.env.ts
git commit -m "feat: add config proxy env vars to generation script"
```

---

## Phase 9: Integration Testing

### Task 9.1: End-to-end local test of the full config flow

**Step 1: Start local infrastructure**

```bash
docker compose -f infra/Local/Storage/docker-compose.yml up -d
```

**Step 2: Verify experiments service responds**

```bash
curl http://localhost:5002/health
# Expected: {"status":"Healthy","environment":"local",...}

curl http://localhost:5002/config/Endpoints:StorageAccount
# Expected: {"key":"Endpoints:StorageAccount","value":"http://127.0.0.1:10000/devstoreaccount1",...}
```

**Step 3: Start API in proxy mode**

```bash
cd sites/api.arolariu.ro/src/Core
INFRA=proxy CONFIG_PROXY_URL=http://localhost:5002 dotnet run
```

Verify health: `curl http://localhost:5000/health`

**Step 4: Start website with proxy**

```bash
cd sites/arolariu.ro
CONFIG_PROXY_URL=http://localhost:5002 npm run dev
```

Verify: Open http://localhost:3000 and test storage operations

**Step 5: Commit integration test documentation**

```bash
git commit -m "docs: add integration testing instructions for config proxy flow"
```

---

## Summary of Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure App Configuration                  │
│                     + Azure Key Vault                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ (Managed Identity)
                           │ 5-min refresh
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              experiments.arolariu.ro                         │
│           (Config Proxy — .NET 10 Minimal API)              │
│                                                             │
│  • Caches all config in-memory                              │
│  • Auto-refreshes from Azure every 5 min                    │
│  • REST API: GET /config/{key}, GET /config?keys=...        │
│  • Local mode: reads appsettings.json                       │
│  • Health check: GET /health                                │
└──────────┬──────────────────────────┬───────────────────────┘
           │ HTTP (5-min refresh)     │ HTTP (5-min TTL cache)
           ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│  api.arolariu.ro     │   │  arolariu.ro (Next.js)           │
│  (.NET 10 API)       │   │                                   │
│                      │   │  configProxy.ts                   │
│  IOptionsMonitor     │   │  • In-memory TTL cache            │
│  ConfigRefreshSvc    │   │  • Fetch from proxy               │
│  ConfigProxyClient   │   │  • Stale-while-revalidate         │
└──────────────────────┘   └──────────────────────────────────┘
```

## Environment Modes

| Mode | `INFRA` env var | Config Source | Use Case |
|------|----------------|---------------|----------|
| **Azure Direct** | `azure` | Azure App Config + Key Vault directly | Legacy / migration |
| **Proxy** | `proxy` | experiments.arolariu.ro REST API | Production (recommended) |
| **Local** | `local` | appsettings.json / env vars | Offline development |

## Key Decisions

1. **Why .NET Minimal API instead of Azure Functions?** — Consistent with existing backend stack, simpler local dev story, no cold start issues, runs in same Docker Compose.

2. **Why HTTP proxy instead of direct SDK access?** — Decouples config from apps (single place to manage Azure credentials), enables config refresh without redeployment, reduces Azure SDK dependencies in the frontend.

3. **Why TTL cache instead of push-based refresh?** — Simpler to implement, works across HTTP, gracefully degrades on proxy failure (stale-while-revalidate pattern).

4. **Why keep `INFRA=azure` mode?** — Backward compatibility during migration. Can be removed once proxy mode is validated in production.

## Migration Strategy

1. Deploy experiments.arolariu.ro first
2. Test with `INFRA=proxy` in staging
3. Switch production API from `INFRA=azure` to `INFRA=proxy`
4. Switch production website to use `CONFIG_PROXY_URL`
5. Monitor for 1-2 weeks
6. Optionally remove `INFRA=azure` codepath

## Risk Mitigation

- **Config proxy down?** Both clients have stale-while-revalidate: they return cached values when the proxy is unreachable.
- **Startup dependency?** The API fetches config at startup. If the proxy is down, it fails fast with a clear error message.
- **Security?** The proxy runs inside the same VNET/App Service plan. No public exposure of secrets.
- **Performance?** Config values are cached in-memory with 5-min TTL. No per-request overhead.
