# Centralized Configuration Service Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple configuration from running apps by building `experiments.arolariu.ro` as a Entra-ID-secured config proxy service, centralizing Azure credential management, removing direct App Config/Key Vault dependencies from API and website, and adding config refresh to the frontend.

**Architecture:** A new .NET 10 Minimal API (`experiments.arolariu.ro`) is the single service that reads from Azure App Configuration + Key Vault. It authenticates callers via Microsoft Entra ID, allowing only the frontend and backend UAMIs. Both API and website fetch config via HTTP from this service. The config URL is hardcoded: `https://experiments.arolariu.ro` in production, `http://localhost:5002` when `INFRA=proxy` (local dev). After migration, Azure App Configuration and Key Vault SDK libraries are removed from the API and website.

**Tech Stack:** .NET 10 Minimal API, Microsoft Entra ID (Easy Auth v2), Azure App Configuration, Azure Key Vault, Azure Identity (DefaultAzureCredential), Next.js Server Actions (server-only), Docker, Bicep IaC

---

## Feedback Addressed (Changes from v1)

| # | Feedback | Resolution |
|---|----------|------------|
| 1 | Keep appsettings endpoints | **Removed Task 2.1** — Key Vault and App Config URLs stay in appsettings files |
| 2 | DefaultAzureCredential singleton expiry | **No concern** — Azure SDK handles token refresh internally. The `TokenCredential` abstraction caches tokens and requests new ones ~5 min before expiry. Singleton is safe. Added note in Task 3.1. |
| 3 | Server-side only for website | **Enforced** — All Azure/config communication uses `"use server"` directive. Added explicit audit step. |
| 4 | Secure experiments.arolariu.ro | **Added Phase 4.3** — Entra ID Easy Auth with `allowedPrincipals.identities` restricting access to frontend + backend UAMI object IDs. Callers acquire Bearer tokens from their UAMI. |
| 5 | Remove App Config/KV libs after proxy | **Added Phase 7** — Removes `Microsoft.Azure.AppConfiguration.AspNetCore`, `Azure.Extensions.AspNetCore.Configuration.Secrets`, `Azure.Security.KeyVault.Secrets` from API, and `@azure/app-configuration`, `@azure/keyvault-secrets` from website. |
| 6 | Hardcode config URL | **Done** — URL is a constant: `https://experiments.arolariu.ro` in Azure mode, `http://localhost:5002` in proxy mode. No env var needed. |

---

## Current State (Reference)

### Credential Duplication Map

**API (`sites/api.arolariu.ro/src/`) — 8 files with `new DefaultAzureCredential()`:**
- `Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs:89`
- `Common/Services/KeyVault/KeyVaultService.cs`
- `Common/Telemetry/Tracing/TracingExtensions.cs`
- `Common/Telemetry/Metering/MeteringExtensions.cs`
- `Common/Telemetry/Logging/LoggingExtensions.cs`
- `Invoices/Brokers/AnalysisBrokers/ClassifierBroker/AzureOpenAiBroker.cs`
- `Invoices/Brokers/AnalysisBrokers/IdentifierBroker/AzureFormRecognizerBroker.cs`
- `Invoices/Modules/WebApplicationBuilderExtensions.cs`

**Website (`sites/arolariu.ro/src/`) — 7 files with `new DefaultAzureCredential()`:**
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
        var credential = AzureCredentialFactory.CreateCredential();
        Assert.NotNull(credential);
        Assert.IsType<DefaultAzureCredential>(credential);
    }

    [Fact]
    public void CreateCredential_ReturnsSameInstance()
    {
        var first = AzureCredentialFactory.CreateCredential();
        var second = AzureCredentialFactory.CreateCredential();
        Assert.Same(first, second); // Singleton — same reference
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
/// Centralized singleton factory for creating Azure credentials.
/// Ensures consistent credential configuration across all Azure service clients.
/// </summary>
/// <remarks>
/// <para><see cref="DefaultAzureCredential"/> handles token lifecycle internally —
/// it caches tokens and requests fresh ones ~5 minutes before expiry.
/// A singleton is safe and recommended to avoid redundant token acquisitions.</para>
/// <para>In RELEASE builds, uses AZURE_CLIENT_ID for User Assigned Managed Identity.
/// In DEBUG builds, falls back to Azure CLI, Visual Studio, etc.</para>
/// </remarks>
public static class AzureCredentialFactory
{
    private static readonly Lazy<TokenCredential> CachedCredential = new(CreateCredentialInternal);

    /// <summary>
    /// Returns the shared <see cref="TokenCredential"/> instance.
    /// Thread-safe, lazy-initialized, and never expires (Azure SDK refreshes tokens internally).
    /// </summary>
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
git commit -m "feat: add centralized AzureCredentialFactory with singleton pattern"
```

### Task 1.2: Replace all DefaultAzureCredential instantiations in API

**Files to modify** (8 files):
- `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs:89-96`
- `sites/api.arolariu.ro/src/Common/Services/KeyVault/KeyVaultService.cs`
- `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/TracingExtensions.cs`
- `sites/api.arolariu.ro/src/Common/Telemetry/Metering/MeteringExtensions.cs`
- `sites/api.arolariu.ro/src/Common/Telemetry/Logging/LoggingExtensions.cs`
- `sites/api.arolariu.ro/src/Invoices/Brokers/AnalysisBrokers/ClassifierBroker/AzureOpenAiBroker.cs`
- `sites/api.arolariu.ro/src/Invoices/Brokers/AnalysisBrokers/IdentifierBroker/AzureFormRecognizerBroker.cs`
- `sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs`

**Step 1: In each file, replace this pattern:**

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

Add import: `using arolariu.Backend.Common.Azure;`

**Step 2: Build**

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

## Phase 2: Remove Reflection-Based Config Mapping (API)

### Task 2.1: Replace reflection mapping with direct property assignment

**Files:**
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs:138-165`

**Step 1: Replace the reflection-based config mapping block**

Replace this (lines 138-165):
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

With direct assignment (no reflection):
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

## Phase 3: Centralize Azure Credentials (Website) — Server-Side Only

> **Important:** ALL Azure SDK communication in the website MUST be server-only.
> Every file using Azure Identity must have `"use server"` at the top.
> No Azure SDK imports in client components.

### Task 3.1: Create centralized getAzureCredential() utility

**Files:**
- Create: `sites/arolariu.ro/src/lib/azure/credentials.ts`
- Test: `sites/arolariu.ro/src/lib/azure/credentials.test.ts`

**Note on singleton lifecycle:** `DefaultAzureCredential` manages token refresh internally — it caches access tokens and automatically requests new ones ~5 minutes before expiry. A module-level singleton is safe and recommended. The credential object itself never "expires"; only the tokens it dispenses have lifetimes, and the SDK handles renewal transparently.

**Step 1: Write the failing test**

```typescript
// sites/arolariu.ro/src/lib/azure/credentials.test.ts
import {describe, it, expect} from "vitest";

describe("Azure Credentials", () => {
  it("getAzureCredential returns an object with getToken method", async () => {
    const {getAzureCredential} = await import("./credentials");
    const credential = getAzureCredential();
    expect(credential).toBeDefined();
    expect(credential).toHaveProperty("getToken");
  });

  it("getAzureCredential returns the same singleton instance", async () => {
    const {getAzureCredential} = await import("./credentials");
    const first = getAzureCredential();
    const second = getAzureCredential();
    expect(first).toBe(second);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/azure/credentials.test.ts --config sites/arolariu.ro/vitest.config.ts`
Expected: FAIL — module not found

**Step 3: Implement**

```typescript
// sites/arolariu.ro/src/lib/azure/credentials.ts
/**
 * @fileoverview Centralized Azure credential singleton for server-side use only.
 *
 * DefaultAzureCredential handles token lifecycle internally — it caches tokens
 * and refreshes them ~5 min before expiry. The singleton never "expires".
 *
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
 *
 * This function is server-only — enforced by "use server" directive.
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
git commit -m "feat: add centralized Azure credential singleton for server-side use"
```

### Task 3.2: Replace all DefaultAzureCredential in website + audit server-only enforcement

**Files to modify** (7 files):
- `sites/arolariu.ro/src/lib/actions/storage/uploadBlob.ts`
- `sites/arolariu.ro/src/lib/actions/storage/fetchBlob.ts`
- `sites/arolariu.ro/src/lib/actions/scans/uploadScan.ts`
- `sites/arolariu.ro/src/lib/actions/scans/fetchScans.ts`
- `sites/arolariu.ro/src/lib/actions/scans/deleteScan.ts`
- `sites/arolariu.ro/src/lib/actions/invoices/createInvoiceScan.ts`
- `sites/arolariu.ro/src/instrumentation.server.ts`

**Step 1: In each file, replace credential creation**

Replace:
```typescript
import {DefaultAzureCredential} from "@azure/identity";
const credentials = new DefaultAzureCredential();
```

With:
```typescript
import {getAzureCredential} from "@/lib/azure/credentials";
const credentials = getAzureCredential();
```

**Step 2: Audit — verify every file using Azure SDK has `"use server"` at top**

Check that ALL these files have `"use server";` as their first meaningful line. If any is missing, add it. These files MUST NOT be importable by client components.

Files to audit:
- `src/lib/azure/credentials.ts` — must have `"use server"`
- `src/lib/actions/storage/uploadBlob.ts` — should already have it
- `src/lib/actions/storage/fetchBlob.ts` — should already have it
- `src/lib/actions/storage/fetchConfig.ts` — should already have it
- `src/lib/actions/scans/uploadScan.ts` — should already have it
- `src/lib/actions/scans/fetchScans.ts` — should already have it
- `src/lib/actions/scans/deleteScan.ts` — should already have it
- `src/lib/actions/invoices/createInvoiceScan.ts` — should already have it
- `src/instrumentation.server.ts` — server-only by filename convention

**Step 3: Build and test**

Run: `npm run lint --workspace=sites/arolariu.ro && npm run build:website && npm run test:website`
Expected: All pass

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/
git commit -m "refactor: replace 7 DefaultAzureCredential instances with centralized singleton"
```

---

## Phase 4: Build experiments.arolariu.ro Config Proxy

### Task 4.1: Scaffold the .NET 10 Minimal API project

**Step 1: Create project**

```bash
cd sites
dotnet new web -n experiments.arolariu.ro --framework net10.0
cd experiments.arolariu.ro
dotnet add package Azure.Identity
dotnet add package Microsoft.Extensions.Configuration.AzureAppConfiguration
dotnet add package Azure.Extensions.AspNetCore.Configuration.Secrets
dotnet add package Azure.Security.KeyVault.Secrets
dotnet add package Microsoft.Identity.Web
```

**Step 2: Build**

Run: `dotnet build sites/experiments.arolariu.ro`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add sites/experiments.arolariu.ro/
git commit -m "feat: scaffold experiments.arolariu.ro config proxy project"
```

### Task 4.2: Implement configuration loading + REST API

**Files:**
- Modify: `sites/experiments.arolariu.ro/Program.cs`
- Create: `sites/experiments.arolariu.ro/ConfigurationContracts.cs`
- Create: `sites/experiments.arolariu.ro/appsettings.json`
- Create: `sites/experiments.arolariu.ro/appsettings.Development.json`

**Step 1: Define response contracts**

```csharp
// sites/experiments.arolariu.ro/ConfigurationContracts.cs
namespace experiments.arolariu.ro;

/// <summary>Response for a single configuration value.</summary>
public sealed record ConfigValueResponse(string Key, string Value, DateTime FetchedAt);

/// <summary>Response for multiple configuration values.</summary>
public sealed record ConfigBatchResponse(IReadOnlyList<ConfigValueResponse> Values, DateTime FetchedAt);
```

**Step 2: Implement Program.cs**

```csharp
// sites/experiments.arolariu.ro/Program.cs
using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Configuration.AzureAppConfiguration;
using Microsoft.Identity.Web;
using experiments.arolariu.ro;

var builder = WebApplication.CreateBuilder(args);

var infrastructure = Environment.GetEnvironmentVariable("INFRA") ?? "local";
var environment = builder.Environment.EnvironmentName;

IConfigurationRoot? configProvider = null;

if (infrastructure == "azure")
{
    var clientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID");
    var credentials = new DefaultAzureCredential(
        clientId is not null
            ? new DefaultAzureCredentialOptions { ManagedIdentityClientId = clientId }
            : new DefaultAzureCredentialOptions());

    var configEndpoint = builder.Configuration["ApplicationOptions:ConfigurationEndpoint"]
        ?? throw new InvalidOperationException("ApplicationOptions:ConfigurationEndpoint required");
    var kvEndpoint = builder.Configuration["ApplicationOptions:SecretsEndpoint"]
        ?? throw new InvalidOperationException("ApplicationOptions:SecretsEndpoint required");

    var label = environment == "Production" ? "PRODUCTION" : "DEVELOPMENT";

    configProvider = new ConfigurationBuilder()
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
            config.ConfigureClientOptions(options =>
            {
                options.Retry.MaxRetries = 10;
                options.Retry.Mode = RetryMode.Exponential;
                options.Retry.Delay = TimeSpan.FromSeconds(30);
                options.Retry.NetworkTimeout = TimeSpan.FromSeconds(300);
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

    // Entra ID authentication — only in Azure mode
    builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration);
    builder.Services.AddAuthorization();
}
else
{
    // Local mode: read from appsettings.json / env vars — NO auth
    configProvider = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", optional: true)
        .AddJsonFile($"appsettings.{environment}.json", optional: true)
        .AddEnvironmentVariables()
        .Build();
}

builder.Services.AddSingleton<IConfiguration>(configProvider);
builder.Services.AddHealthChecks();

var app = builder.Build();

if (infrastructure == "azure")
{
    app.UseAuthentication();
    app.UseAuthorization();
}

// Health endpoint — always public
app.MapHealthChecks("/health");
app.MapGet("/", () => Results.Ok(new { status = "Healthy", environment = infrastructure, timestamp = DateTime.UtcNow }));

// Config endpoints — protected in Azure mode
var configGroup = app.MapGroup("/config");
if (infrastructure == "azure")
{
    configGroup.RequireAuthorization();
}

// GET /config/{key} — single value
configGroup.MapGet("/{*key}", (string key, IConfiguration config) =>
{
    var value = config[key];
    return value is not null
        ? Results.Ok(new ConfigValueResponse(key, value, DateTime.UtcNow))
        : Results.NotFound(new { error = $"Key '{key}' not found" });
});

// GET /config?keys=key1,key2 — batch values
configGroup.MapGet("/", (string? keys, string? prefix, IConfiguration config) =>
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
  "Logging": { "LogLevel": { "Default": "Information" } },
  "AllowedHosts": "*",
  "ApplicationOptions": {
    "SecretsEndpoint": "",
    "ConfigurationEndpoint": ""
  },
  "Common:Auth:Secret": "local-dev-jwt-secret-at-least-32-characters-long!!",
  "Common:Auth:Issuer": "https://localhost:5000",
  "Common:Auth:Audience": "https://localhost:3000",
  "Common:Azure:TenantId": "",
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

**Step 4: Add Entra ID config for production (appsettings.Production.json)**

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<from-env-or-bicep>",
    "ClientId": "<app-registration-client-id>",
    "Audience": "api://experiments-arolariu-ro"
  },
  "ApplicationOptions": {
    "SecretsEndpoint": "https://qpfnu3kv.vault.azure.net/",
    "ConfigurationEndpoint": "https://qpfnu3appconfig.azconfig.io"
  }
}
```

**Step 5: Build and verify**

Run: `dotnet build sites/experiments.arolariu.ro`
Expected: Build succeeded

**Step 6: Commit**

```bash
git add sites/experiments.arolariu.ro/
git commit -m "feat: implement config proxy with Entra ID auth and local fallback"
```

### Task 4.3: Add Dockerfile + Docker Compose entry

**Files:**
- Create: `sites/experiments.arolariu.ro/Dockerfile`
- Modify: `infra/Local/Storage/docker-compose.yml`

**Step 1: Write Dockerfile**

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

**Step 2: Add to Docker Compose**

Add to `infra/Local/Storage/docker-compose.yml`:

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

**Step 3: Build and test Docker image**

Run: `docker compose -f infra/Local/Storage/docker-compose.yml build experiments`
Verify: `docker compose -f infra/Local/Storage/docker-compose.yml up experiments -d && curl http://localhost:5002/health`
Expected: `{"status":"Healthy","environment":"local",...}`

**Step 4: Commit**

```bash
git add sites/experiments.arolariu.ro/Dockerfile infra/Local/Storage/docker-compose.yml
git commit -m "feat: add Dockerfile and Docker Compose entry for experiments service"
```

---

## Phase 5: Config Client for API

### Task 5.1: Create ConfigProxyClient

**Files:**
- Create: `sites/api.arolariu.ro/src/Common/Configuration/IConfigProxyClient.cs`
- Create: `sites/api.arolariu.ro/src/Common/Configuration/ConfigProxyClient.cs`
- Test: `sites/api.arolariu.ro/tests/Common/Configuration/ConfigProxyClientTests.cs`

**Step 1: Define the interface**

```csharp
// sites/api.arolariu.ro/src/Common/Configuration/IConfigProxyClient.cs
namespace arolariu.Backend.Common.Configuration;

/// <summary>Client for fetching configuration from experiments.arolariu.ro.</summary>
public interface IConfigProxyClient
{
    /// <summary>Fetches a single configuration value by key.</summary>
    Task<string?> GetValueAsync(string key, CancellationToken ct = default);

    /// <summary>Fetches multiple configuration values.</summary>
    Task<IReadOnlyDictionary<string, string>> GetValuesAsync(IEnumerable<string> keys, CancellationToken ct = default);
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
        var handler = new MockHttpHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(
                new { Key = "test:key", Value = "test-value", FetchedAt = DateTime.UtcNow }))
        });
        var client = new ConfigProxyClient(new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5002") });

        var result = await client.GetValueAsync("test:key");

        Assert.Equal("test-value", result);
    }

    [Fact]
    public async Task GetValueAsync_ReturnsNull_WhenNotFound()
    {
        var handler = new MockHttpHandler(new HttpResponseMessage(HttpStatusCode.NotFound));
        var client = new ConfigProxyClient(new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5002") });

        var result = await client.GetValueAsync("missing:key");

        Assert.Null(result);
    }
}

internal class MockHttpHandler(HttpResponseMessage response) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        => Task.FromResult(response);
}
```

**Step 3: Run test to verify it fails**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "ConfigProxyClientTests" -v n`
Expected: FAIL — `ConfigProxyClient` does not exist

**Step 4: Implement**

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

/// <summary>HTTP client for the experiments.arolariu.ro config proxy.</summary>
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

    private sealed record ConfigValueDto(string Key, string Value, DateTime FetchedAt);
    private sealed record ConfigBatchDto(IReadOnlyList<ConfigValueDto> Values, DateTime FetchedAt);
}
```

**Step 5: Run tests**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "ConfigProxyClientTests" -v n`
Expected: PASS

**Step 6: Commit**

```bash
git add sites/api.arolariu.ro/src/Common/Configuration/ sites/api.arolariu.ro/tests/Common/Configuration/
git commit -m "feat: add ConfigProxyClient for experiments.arolariu.ro"
```

### Task 5.2: Add "proxy" infrastructure mode with hardcoded URL + Bearer auth

**Files:**
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs`

**Step 1: Add constants and new infrastructure mode**

Add at the top of the class:
```csharp
/// <summary>Config proxy URL — hardcoded by design, never changes.</summary>
private const string ConfigProxyUrlAzure = "https://experiments.arolariu.ro";
private const string ConfigProxyUrlLocal = "http://localhost:5002";
private const string ExperimentsScope = "api://experiments-arolariu-ro/.default";
```

Update the switch in `AddGeneralDomainConfiguration`:
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

**Step 2: Add AddProxyConfiguration method**

```csharp
/// <summary>
/// Configures the application to fetch configuration from experiments.arolariu.ro.
/// In Azure mode, acquires a Bearer token from the backend's UAMI.
/// In proxy (local) mode, no auth — talks to localhost:5002.
/// </summary>
private static void AddProxyConfiguration(this WebApplicationBuilder builder)
{
    var services = builder.Services;
    var isAzure = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
    var baseUrl = isAzure ? ConfigProxyUrlAzure : ConfigProxyUrlLocal;

    services.AddHttpClient<IConfigProxyClient, ConfigProxyClient>(client =>
    {
        client.BaseAddress = new Uri(baseUrl);
        client.Timeout = TimeSpan.FromSeconds(30);
    }).ConfigurePrimaryHttpMessageHandler(() =>
    {
        // In Azure: add Bearer token from UAMI
        if (isAzure)
        {
            return new BearerTokenHandler(AzureCredentialFactory.CreateCredential(), ExperimentsScope);
        }
        return new HttpClientHandler();
    });

    // Fetch config at startup
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
        var cfg = builder.Configuration;
        options.SecretsEndpoint = cfg["ApplicationOptions:SecretsEndpoint"] ?? string.Empty;
        options.ConfigurationEndpoint = cfg["ApplicationOptions:ConfigurationEndpoint"] ?? string.Empty;
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

**Step 3: Create BearerTokenHandler**

```csharp
// sites/api.arolariu.ro/src/Common/Azure/BearerTokenHandler.cs
namespace arolariu.Backend.Common.Azure;

using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using global::Azure.Core;

/// <summary>
/// DelegatingHandler that acquires a Bearer token from Azure Identity
/// and attaches it to outgoing HTTP requests.
/// </summary>
public sealed class BearerTokenHandler(TokenCredential credential, string scope) : DelegatingHandler(new HttpClientHandler())
{
    private readonly TokenRequestContext _tokenContext = new([scope]);

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var token = await credential.GetTokenAsync(_tokenContext, ct).ConfigureAwait(false);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        return await base.SendAsync(request, ct).ConfigureAwait(false);
    }
}
```

**Step 4: Build**

Run: `dotnet build sites/api.arolariu.ro/src/Core`
Expected: Build succeeded

**Step 5: Commit**

```bash
git add sites/api.arolariu.ro/src/
git commit -m "feat: add proxy infrastructure mode with Entra ID Bearer auth"
```

### Task 5.3: Add background config refresh via HostedService

**Files:**
- Create: `sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs`

**Step 1: Implement**

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

/// <summary>Background service that refreshes config from the proxy every 5 minutes.</summary>
public sealed class ConfigRefreshHostedService(
    IServiceProvider serviceProvider,
    IOptionsMonitor<AzureOptions> optionsMonitor,
    ILogger<ConfigRefreshHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(5);

    private static readonly string[] ConfigKeys =
    [
        "Common:Auth:Secret", "Common:Auth:Issuer", "Common:Auth:Audience",
        "Common:Azure:TenantId", "Endpoints:OpenAI", "Endpoints:SqlServer",
        "Endpoints:NoSqlServer", "Endpoints:StorageAccount",
        "Endpoints:ApplicationInsights", "Endpoints:CognitiveServices",
        "Endpoints:CognitiveServices:Key"
    ];

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
                var values = await proxyClient.GetValuesAsync(ConfigKeys, stoppingToken).ConfigureAwait(false);

                var opts = optionsMonitor.CurrentValue;
                opts.JwtSecret = values.GetValueOrDefault("Common:Auth:Secret", opts.JwtSecret);
                opts.JwtIssuer = values.GetValueOrDefault("Common:Auth:Issuer", opts.JwtIssuer);
                opts.JwtAudience = values.GetValueOrDefault("Common:Auth:Audience", opts.JwtAudience);
                opts.OpenAIEndpoint = values.GetValueOrDefault("Endpoints:OpenAI", opts.OpenAIEndpoint);
                opts.SqlConnectionString = values.GetValueOrDefault("Endpoints:SqlServer", opts.SqlConnectionString);
                opts.NoSqlConnectionString = values.GetValueOrDefault("Endpoints:NoSqlServer", opts.NoSqlConnectionString);
                opts.StorageAccountEndpoint = values.GetValueOrDefault("Endpoints:StorageAccount", opts.StorageAccountEndpoint);
                opts.ApplicationInsightsEndpoint = values.GetValueOrDefault("Endpoints:ApplicationInsights", opts.ApplicationInsightsEndpoint);
                opts.CognitiveServicesEndpoint = values.GetValueOrDefault("Endpoints:CognitiveServices", opts.CognitiveServicesEndpoint);
                opts.CognitiveServicesKey = values.GetValueOrDefault("Endpoints:CognitiveServices:Key", opts.CognitiveServicesKey);

                logger.LogInformation("Config refreshed from proxy at {Timestamp}", DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Config refresh failed. Retrying in {Interval}.", RefreshInterval);
            }
        }
    }
}
```

**Step 2: Register in AddProxyConfiguration()**

Add at the end of `AddProxyConfiguration()`:
```csharp
services.AddHostedService<ConfigRefreshHostedService>();
```

**Step 3: Build**

Run: `dotnet build sites/api.arolariu.ro/src/Core`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs
git commit -m "feat: add background config refresh hosted service"
```

---

## Phase 6: Config Client for Website (Server-Side Only)

### Task 6.1: Create configProxy.ts with TTL cache + Bearer auth

**Files:**
- Create: `sites/arolariu.ro/src/lib/config/configProxy.ts`
- Test: `sites/arolariu.ro/src/lib/config/configProxy.test.ts`

> **Server-only enforcement:** This file uses `"use server"` and should NEVER be imported by client components.

**Step 1: Write the failing test**

```typescript
// sites/arolariu.ro/src/lib/config/configProxy.test.ts
import {describe, it, expect, vi, beforeEach} from "vitest";

describe("ConfigProxy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("fetchConfigValue returns cached value on second call without re-fetching", async () => {
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

  it("fetchConfigValue returns stale value on network error", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return Promise.resolve({ok: true, json: () => Promise.resolve({Key: "k", Value: "v", FetchedAt: ""})});
      return Promise.reject(new Error("Network error"));
    });
    vi.stubGlobal("fetch", mockFetch);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    await fetchConfigValue("k"); // prime cache
    invalidateConfigCache("k"); // force refetch
    const result = await fetchConfigValue("k"); // should use stale value on error
    expect(result).toBe("v");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/config/configProxy.test.ts --config sites/arolariu.ro/vitest.config.ts`
Expected: FAIL — module not found

**Step 3: Implement**

```typescript
// sites/arolariu.ro/src/lib/config/configProxy.ts
/**
 * @fileoverview Server-side-only config proxy client with TTL caching.
 *
 * Config URL is hardcoded:
 * - Azure (production): https://experiments.arolariu.ro
 * - Local (INFRA=proxy): http://localhost:5002
 *
 * In Azure mode, acquires a Bearer token from the frontend UAMI via @azure/identity.
 *
 * @module sites/arolariu.ro/src/lib/config/configProxy
 */

"use server";

const INFRA = process.env["INFRA"] ?? "local";
const CONFIG_PROXY_URL = INFRA === "proxy" ? "http://localhost:5002" : "https://experiments.arolariu.ro";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EXPERIMENTS_SCOPE = "api://experiments-arolariu-ro/.default";

interface CacheEntry {
  value: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Acquires a Bearer token for the experiments service (Azure only).
 * Returns empty string in local mode.
 */
async function getBearerToken(): Promise<string> {
  if (INFRA !== "azure") return "";
  const {getAzureCredential} = await import("@/lib/azure/credentials");
  const credential = getAzureCredential();
  const token = await credential.getToken(EXPERIMENTS_SCOPE);
  return token?.token ?? "";
}

/**
 * Fetches a single config value with TTL caching + stale-while-revalidate.
 * Server-only — enforced by "use server" directive.
 */
export async function fetchConfigValue(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const headers: Record<string, string> = {};
    const bearerToken = await getBearerToken();
    if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

    const response = await fetch(`${CONFIG_PROXY_URL}/config/${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers,
    });

    if (!response.ok) return cached?.value ?? "";

    const data = (await response.json()) as {Key: string; Value: string; FetchedAt: string};
    cache.set(key, {value: data.Value, fetchedAt: Date.now()});
    return data.Value;
  } catch {
    return cached?.value ?? "";
  }
}

/**
 * Fetches multiple config values in one batch request.
 */
export async function fetchConfigValues(keys: string[]): Promise<Record<string, string>> {
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
    const headers: Record<string, string> = {};
    const bearerToken = await getBearerToken();
    if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

    const keysParam = uncachedKeys.map(encodeURIComponent).join(",");
    const response = await fetch(`${CONFIG_PROXY_URL}/config?keys=${keysParam}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers,
    });

    if (response.ok) {
      const data = (await response.json()) as {Values: Array<{Key: string; Value: string}>};
      for (const item of data.Values) {
        cache.set(item.Key, {value: item.Value, fetchedAt: Date.now()});
        result[item.Key] = item.Value;
      }
    }
  } catch {
    for (const key of uncachedKeys) {
      result[key] = cache.get(key)?.value ?? "";
    }
  }

  return result;
}

/** Invalidates cache for a key or all keys. */
export function invalidateConfigCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}
```

**Step 4: Run tests**

Run: `npx vitest run src/lib/config/configProxy.test.ts --config sites/arolariu.ro/vitest.config.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/lib/config/
git commit -m "feat: add server-only config proxy client with TTL cache and Bearer auth"
```

### Task 6.2: Replace fetchConfigurationValue + remove hardcoded hostname

**Files:**
- Modify: `sites/arolariu.ro/src/lib/actions/storage/fetchConfig.ts`
- Modify: `sites/arolariu.ro/next.config.ts:65`

**Step 1: Redirect fetchConfig.ts through the proxy**

```typescript
// sites/arolariu.ro/src/lib/actions/storage/fetchConfig.ts
"use server";

import {fetchConfigValue} from "@/lib/config/configProxy";

/**
 * Server action that fetches a configuration value.
 * Delegates to the experiments.arolariu.ro config proxy.
 */
export default async function fetchConfigurationValue(key: string): Promise<string> {
  return fetchConfigValue(key);
}
```

**Step 2: Replace hardcoded blob hostname in next.config.ts**

Change line 65:
```typescript
{protocol: "https", hostname: "qpfnu3sacc.blob.core.windows.net"},
```
To:
```typescript
...(process.env["AZURE_STORAGE_HOSTNAME"]
  ? [{protocol: "https" as const, hostname: process.env["AZURE_STORAGE_HOSTNAME"]}]
  : []),
```

Add `AZURE_STORAGE_HOSTNAME=qpfnu3sacc.blob.core.windows.net` to `.env` and `.env.example`.

**Step 3: Build and test**

Run: `npm run build:website && npm run test:website`
Expected: All pass

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/lib/actions/storage/fetchConfig.ts sites/arolariu.ro/next.config.ts sites/arolariu.ro/.env sites/arolariu.ro/.env.example
git commit -m "refactor: redirect config through proxy, remove hardcoded blob hostname"
```

---

## Phase 7: Remove Direct Azure Config Libraries

> Now that all config flows through experiments.arolariu.ro, the API and website no longer need direct Azure App Configuration or Key Vault libraries.

### Task 7.1: Remove Azure App Config + Key Vault config libraries from API

**Files:**
- Modify: `sites/api.arolariu.ro/src/Common/Common.csproj`
- Delete: `sites/api.arolariu.ro/src/Common/Services/KeyVault/KeyVaultService.cs`
- Delete: `sites/api.arolariu.ro/src/Common/Services/KeyVault/IKeyVaultService.cs`
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs`

**Step 1: Remove NuGet packages from Common.csproj**

Remove these package references:
```xml
<PackageReference Include="Microsoft.Azure.AppConfiguration.AspNetCore" />
<PackageReference Include="Microsoft.Extensions.Configuration.AzureAppConfiguration" />
<PackageReference Include="Azure.Extensions.AspNetCore.Configuration.Secrets" />
<PackageReference Include="Azure.Security.KeyVault.Secrets" />
```

**Keep** these (still needed for service clients like Cosmos, Storage, OpenAI):
```xml
<PackageReference Include="Azure.Identity" />
<PackageReference Include="Azure.Core" />
```

**Step 2: Delete KeyVaultService and IKeyVaultService**

These files are only registered in `AddAzureConfiguration()` and never consumed by any other service at runtime. Safe to delete.

**Step 3: Clean up AddAzureConfiguration()**

Remove `KeyVaultService` registration and Azure Key Vault configuration builder code from `AddAzureConfiguration()`. This method can now be marked as `[Obsolete("Use AddProxyConfiguration instead")]` or removed entirely if migration is complete.

**Step 4: Build**

Run: `dotnet build sites/api.arolariu.ro/src/Core`
Expected: Build succeeded (may have warnings about obsolete method if you kept it)

**Step 5: Run tests**

Run: `dotnet test sites/api.arolariu.ro/tests -v n`
Expected: All pass (remove any KeyVaultService tests if they existed)

**Step 6: Commit**

```bash
git add -A sites/api.arolariu.ro/
git commit -m "refactor: remove Azure App Config and Key Vault config libraries from API"
```

### Task 7.2: Remove Azure config libraries from website

**Files:**
- Modify: `sites/arolariu.ro/package.json`
- Delete: `sites/arolariu.ro/src/lib/actions/storage/fetchConfig.test.ts` (old test)

**Step 1: Remove npm packages**

```bash
cd sites/arolariu.ro
npm uninstall @azure/app-configuration @azure/keyvault-secrets
```

**Note:** Keep `@azure/identity` and `@azure/storage-blob` — still needed for storage operations. Keep `@azure/monitor-opentelemetry-exporter` — still needed for telemetry.

**Step 2: Verify no remaining imports**

Run: `grep -r "@azure/app-configuration\|@azure/keyvault-secrets" sites/arolariu.ro/src/`
Expected: No matches

**Step 3: Build and test**

Run: `npm run build:website && npm run test:website`
Expected: All pass

**Step 4: Commit**

```bash
git add sites/arolariu.ro/package.json sites/arolariu.ro/package-lock.json
git commit -m "refactor: remove @azure/app-configuration and @azure/keyvault-secrets from website"
```

---

## Phase 8: Infrastructure (Bicep)

### Task 8.1: Create App Registration for experiments.arolariu.ro

This is a manual Azure Portal / CLI step (cannot be fully automated in Bicep):

**Step 1: Register the app in Entra ID**

```bash
az ad app create --display-name "experiments-arolariu-ro" \
  --identifier-uris "api://experiments-arolariu-ro" \
  --sign-in-audience "AzureADMyOrg"
```

**Step 2: Note the Application (client) ID** — use in Bicep as a parameter.

### Task 8.2: Add experiments.arolariu.ro Bicep module

**Files:**
- Create: `infra/Azure/Bicep/sites/experiments.bicep`
- Modify: `infra/Azure/Bicep/sites/deploymentFile.bicep`
- Modify: `infra/Azure/Bicep/facade.bicep`

**Step 1: Create Bicep module**

```bicep
// infra/Azure/Bicep/sites/experiments.bicep
metadata description = 'Deploys experiments.arolariu.ro config proxy with Entra ID Easy Auth.'

param resourceLocation string
param resourceDeploymentDate string
param resourceConventionPrefix string
param appServicePlanId string
param backendIdentityResourceId string
param backendIdentityClientId string
param frontendIdentityPrincipalId string
param backendIdentityPrincipalId string
param entraAppClientId string

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
    project: 'arolariu.ro'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      alwaysOn: false
      linuxFxVersion: 'DOCKER|experiments-arolariu-ro:latest'
      appSettings: [
        { name: 'AZURE_CLIENT_ID', value: backendIdentityClientId }
        { name: 'INFRA', value: 'azure' }
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
      ]
    }
  }
}

// Easy Auth v2 — restrict to frontend + backend UAMIs only
resource authSettings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: experimentsWebApp
  name: 'authsettingsV2'
  properties: {
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'Return401'
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraAppClientId
          openIdIssuer: 'https://login.microsoftonline.com/${tenant().tenantId}/v2.0'
        }
        validation: {
          defaultAuthorizationPolicy: {
            allowedPrincipals: {
              identities: [
                frontendIdentityPrincipalId
                backendIdentityPrincipalId
              ]
            }
          }
        }
      }
    }
  }
}

output experimentsSiteDefaultHostname string = experimentsWebApp.properties.defaultHostName
```

**Step 2: Wire into facade.bicep and deploymentFile.bicep**

Pass the required parameters (identity principal IDs, App Registration client ID) through the facade.

**Step 3: Commit**

```bash
git add infra/Azure/Bicep/
git commit -m "feat: add experiments.arolariu.ro Bicep with Entra ID Easy Auth"
```

### Task 8.3: Add RBAC for experiments service

**Files:**
- Modify: `infra/Azure/Bicep/rbac/app-configuration-rbac.bicep`
- Modify: `infra/Azure/Bicep/rbac/key-vault-rbac.bicep`

The experiments service uses the **backend UAMI**, which already has App Configuration Data Reader and Key Vault Secrets User roles. No additional RBAC changes needed — just verify.

**Step 1: Verify existing roles**

Check that the backend UAMI has:
- `App Configuration Data Reader` on the App Config store
- `Key Vault Secrets User` on the Key Vault

**Step 2: Commit** (if any changes needed)

```bash
git add infra/Azure/Bicep/rbac/
git commit -m "chore: verify RBAC for experiments service backend identity"
```

---

## Phase 9: Integration Testing

### Task 9.1: Local end-to-end test

**Step 1: Start local stack**

```bash
docker compose -f infra/Local/Storage/docker-compose.yml up -d
```

**Step 2: Verify experiments service**

```bash
curl http://localhost:5002/health
# Expected: {"status":"Healthy","environment":"local",...}

curl http://localhost:5002/config/Endpoints:StorageAccount
# Expected: {"key":"Endpoints:StorageAccount","value":"http://127.0.0.1:10000/devstoreaccount1",...}

curl "http://localhost:5002/config?keys=Common:Auth:Issuer,Common:Auth:Audience"
# Expected: {"values":[...], "fetchedAt":"..."}
```

**Step 3: Start API in proxy mode**

```bash
INFRA=proxy ASPNETCORE_ENVIRONMENT=Development dotnet run --project sites/api.arolariu.ro/src/Core
```

Verify: `curl http://localhost:5000/health`

**Step 4: Start website**

```bash
INFRA=proxy npm run dev --workspace=sites/arolariu.ro
```

Verify: Open http://localhost:3000, test storage operations.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│             Azure App Configuration + Key Vault             │
└──────────────────────────┬──────────────────────────────────┘
                           │ Managed Identity (backend UAMI)
                           │ 5-min auto-refresh
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                experiments.arolariu.ro                       │
│             (.NET 10 Minimal API — config proxy)            │
│                                                             │
│  Auth: Entra ID Easy Auth (Azure)  /  None (local)          │
│  Allowed callers: frontend UAMI + backend UAMI only         │
│  Cache: in-memory, 5-min refresh from Azure                 │
│  REST: GET /config/{key}  |  GET /config?keys=...           │
└──────────┬──────────────────────────┬───────────────────────┘
           │ Bearer token (UAMI)      │ Bearer token (UAMI)
           │ Hardcoded URL            │ Hardcoded URL
           ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│  api.arolariu.ro     │   │  arolariu.ro (Next.js)           │
│  (.NET 10 API)       │   │                                   │
│                      │   │  configProxy.ts (server-only)     │
│  IOptionsMonitor     │   │  • TTL cache (5 min)              │
│  ConfigRefreshSvc    │   │  • Stale-while-revalidate         │
│  ConfigProxyClient   │   │  • "use server" enforced          │
│                      │   │                                   │
│  NO App Config SDK   │   │  NO @azure/app-configuration     │
│  NO Key Vault SDK    │   │  NO @azure/keyvault-secrets      │
└──────────────────────┘   └──────────────────────────────────┘
```

## Environment Modes

| Mode | `INFRA` env var | Config Source | Auth | Config URL |
|------|----------------|---------------|------|------------|
| **Azure** | `azure` | App Config + KV directly | N/A (legacy) | N/A |
| **Proxy (production)** | `azure` + proxy code | experiments.arolariu.ro | Entra ID Bearer | `https://experiments.arolariu.ro` |
| **Proxy (local dev)** | `proxy` | experiments.arolariu.ro (Docker) | None | `http://localhost:5002` |
| **Local** | `local` | appsettings.json / env vars | N/A | N/A |

## Security Model

| Layer | Mechanism | Details |
|-------|-----------|---------|
| **Network** | App Service Easy Auth v2 | All `/config/*` routes require Azure AD token |
| **Identity** | `allowedPrincipals.identities` | Only frontend + backend UAMI object IDs can access |
| **Token** | UAMI → Azure AD → Bearer | Callers acquire tokens via their UAMI automatically |
| **Local bypass** | `INFRA != azure` | Auth disabled in local/proxy dev mode |
| **Data** | Non-sensitive only via proxy | Secrets stay in Key Vault; proxy resolves references |

## Libraries Removed After Migration

| Library | Removed From | Reason |
|---------|-------------|--------|
| `Microsoft.Azure.AppConfiguration.AspNetCore` | API | Config via proxy now |
| `Microsoft.Extensions.Configuration.AzureAppConfiguration` | API | Config via proxy now |
| `Azure.Extensions.AspNetCore.Configuration.Secrets` | API | Config via proxy now |
| `Azure.Security.KeyVault.Secrets` | API | KeyVaultService unused at runtime |
| `@azure/app-configuration` | Website | Config via proxy now |
| `@azure/keyvault-secrets` | Website | Never used in src |

## Libraries Kept

| Library | Kept In | Reason |
|---------|---------|--------|
| `Azure.Identity` | API | Still needed for Cosmos, Storage, OpenAI, Form Recognizer |
| `Azure.Core` | API | Transitive dependency |
| `@azure/identity` | Website | Still needed for Storage blob operations |
| `@azure/storage-blob` | Website | Still needed for storage operations |
| `@azure/monitor-opentelemetry-exporter` | Website | Still needed for telemetry |
