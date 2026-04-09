/**
 * @fileoverview Hybrid local development orchestrator for the arolariu.ro monorepo.
 * @module scripts/dev-local
 *
 * @remarks
 * Starts Docker infrastructure (databases, config service, reverse proxy) then
 * launches bare-metal dev servers with hot reload for the services you're working on.
 *
 * This is the recommended development workflow for 95% of local development.
 *
 * @example
 * ```bash
 * npm run dev:local              # Start infra + website + API + exp
 * npm run dev:local -- --frontend  # Start infra + website only
 * npm run dev:local -- --backend   # Start infra + API + exp only
 * npm run dev:local -- --infra     # Start infra only (no services)
 * ```
 */

import {execSync, spawn, type ChildProcess} from "node:child_process";
import {join} from "node:path";
import {styleText} from "node:util";

const INFRA_DIR = join(process.cwd(), "infra", "Local");


// ============================================================================
// Helpers
// ============================================================================

function log(emoji: string, message: string): void {
  console.log(`${emoji} ${message}`);
}

function logStep(step: number, total: number, message: string): void {
  console.log(styleText("cyan", `  [${step}/${total}] ${message}`));
}

function logSuccess(message: string): void {
  console.log(styleText("green", `  ✓ ${message}`));
}

function logWarning(message: string): void {
  console.log(styleText("yellow", `  ⚠ ${message}`));
}

function logError(message: string): void {
  console.error(styleText("red", `  ✗ ${message}`));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dockerCompose(file: string, args: string): void {
  const cmd = `docker compose -f ${file} ${args}`;
  try {
    execSync(cmd, {cwd: INFRA_DIR, stdio: "pipe"});
  } catch (error: unknown) {
    const execError = error as {stderr?: Buffer | string; stdout?: Buffer | string};
    const stderr = execError.stderr?.toString().trim() ?? "";
    const stdout = execError.stdout?.toString().trim() ?? "";
    logError(`Docker compose failed: ${cmd}`);
    if (stderr) console.error(stderr);
    if (stdout) console.error(stdout);
    throw error;
  }
}

async function waitForHealth(url: string, label: string, timeoutMs: number = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(3_000)});
      if (response.ok) return true;
    } catch {
      // not ready yet
    }
    await sleep(2_000);
  }
  logWarning(`${label} did not become healthy within ${timeoutMs / 1000}s`);
  return false;
}

// ============================================================================
// Docker Infrastructure
// ============================================================================

function checkDocker(): boolean {
  try {
    execSync("docker info", {stdio: "pipe"});
    return true;
  } catch {
    return false;
  }
}

function startManagement(): void {
  logStep(1, 5, "Starting Traefik reverse proxy...");
  dockerCompose("Management/docker-compose.yml", "up -d");
  logSuccess("Traefik started");
}

function startStorage(): void {
  logStep(2, 5, "Starting databases (CosmosDB, SQL, Redis, Azurite, exp)...");
  dockerCompose("Storage/docker-compose.yml", "up -d");
  logSuccess("Storage containers started");
}

function swapExpToBareMetalMode(): void {
  logStep(3, 5, "Stopping Docker exp → starting bare-metal exp (localhost config)...");
  try {
    execSync("docker stop exp-arolariu-ro", {stdio: "pipe"});
  } catch {
    // Container may not be running
  }
  logSuccess("Docker exp stopped — bare-metal exp will serve localhost-friendly config");
}

async function waitForInfra(): Promise<void> {
  logStep(4, 5, "Waiting for databases to be ready...");

  const checks = [
    waitForHealth("http://localhost:8081/", "CosmosDB emulator"),
    waitForHealth("http://localhost:10000/devstoreaccount1?comp=list", "Azurite blob storage"),
  ];

  const results = await Promise.all(checks);
  const allHealthy = results.every(Boolean);

  if (allHealthy) {
    logSuccess("All infrastructure services are healthy");
  } else {
    logWarning("Some services may still be starting — proceeding with initialization");
  }
}

function initDatabases(): void {
  logStep(5, 5, "Initializing databases...");

  // SQL Server schema
  try {
    execSync(
      `docker exec -i mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -P "qazWSXedcRFV1234!" -d master -i /usr/sql/sqlSchema.sql -No`,
      {stdio: "pipe"},
    );
    logSuccess("SQL Server schema initialized");
  } catch {
    logWarning("SQL schema init skipped (may already exist or MSSQL still starting)");
  }

  // CosmosDB containers — use Node fetch instead of curl for cross-platform compatibility
  {
    const cosmosInit = [
      {url: "http://localhost:8081/dbs", body: JSON.stringify({id: "primary"})},
      {
        url: "http://localhost:8081/dbs/primary/colls",
        body: JSON.stringify({id: "invoices", partitionKey: {paths: ["/UserIdentifier"], kind: "Hash"}}),
      },
      {
        url: "http://localhost:8081/dbs/primary/colls",
        body: JSON.stringify({id: "merchants", partitionKey: {paths: ["/parentCompanyId"], kind: "Hash"}}),
      },
    ];
    let created = false;
    let failed = false;
    for (const {url, body} of cosmosInit) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body,
          signal: AbortSignal.timeout(5_000),
        });
        if (response.ok) {
          created = true;
        } else if (response.status !== 409) {
          failed = true;
          logWarning(`CosmosDB POST ${url} returned ${response.status}`);
        }
      } catch {
        failed = true;
      }
    }
    if (!failed) {
      logSuccess(created ? "CosmosDB database and containers initialized" : "CosmosDB containers already exist");
    } else {
      logWarning("CosmosDB init incomplete (emulator may still be starting)");
    }
  }

  // Azurite blob containers
  try {
    execSync(
      `node -e "const{BlobServiceClient:B}=require('@azure/storage-blob');const c=B.fromConnectionString('DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;');Promise.all(['invoices'].map(async n=>{const cc=c.getContainerClient(n);await cc.createIfNotExists();await cc.setAccessPolicy('blob');})).then(()=>c.setProperties({cors:[{allowedOrigins:'*',allowedMethods:'GET,HEAD,OPTIONS',allowedHeaders:'*',exposedHeaders:'*',maxAgeInSeconds:3600}]})).catch(()=>{});"`,
      {stdio: "pipe"},
    );
    logSuccess("Azurite blob containers initialized with CORS");
  } catch {
    logWarning("Azurite init skipped (may already exist)");
  }
}

// ============================================================================
// Docker-hosted services (API needs Docker DNS to reach exp at http://exp)
// ============================================================================

function startApiInDocker(): void {
  log("🐳", styleText("bold", "Starting API in Docker (needs Docker DNS for exp service)..."));
  dockerCompose("Backend/docker-compose.yml", "up -d --build");
  logSuccess("API container started on http://localhost:5000");
}

// ============================================================================
// Bare-metal services
// ============================================================================

function startBareMetalServices(services: string[]): ChildProcess[] {
  const processes: ChildProcess[] = [];

  for (const service of services) {
    log("🚀", styleText("bold", `Starting ${service} (bare-metal with hot reload)...`));

    const child = spawn("npx", ["nx", "run", `${service}:dev`], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: true,
      env: {...process.env, INFRA: "local", EXP_PROXY_URL: "http://localhost:5002", FORCE_COLOR: "1"},
    });

    processes.push(child);
  }

  return processes;
}

// ============================================================================
// Main
// ============================================================================

type DevProfile = "all" | "frontend" | "backend" | "infra" | "setup-only";

function parseArgs(): DevProfile {
  const args = process.argv.slice(2);
  if (args.includes("--setup-only") || args.includes("-s")) return "setup-only";
  if (args.includes("--frontend") || args.includes("-f")) return "frontend";
  if (args.includes("--backend") || args.includes("-b")) return "backend";
  if (args.includes("--infra") || args.includes("-i")) return "infra";
  return "all";
}

// All services run bare-metal with hot reload. exp runs bare-metal (not Docker)
// so it serves config.json with localhost URLs that bare-metal services can reach.
// Docker provides only databases (CosmosDB, SQL, Redis, Azurite) + Traefik.
const BARE_METAL_SERVICES: Record<DevProfile, string[]> = {
  all: ["exp", "website", "api"],
  frontend: ["exp", "website"],
  backend: ["exp", "api"],
  infra: ["exp"],
  "setup-only": [],
};

const NEEDS_API_DOCKER: Record<DevProfile, boolean> = {
  all: false,
  frontend: false,
  backend: false,
  infra: false,
  "setup-only": false,
};

async function main(): Promise<void> {
  console.log(styleText(["bold", "magenta"], "\n╔══════════════════════════════════════════════╗"));
  console.log(styleText(["bold", "magenta"], "║   arolariu.ro Local Development Orchestrator  ║"));
  console.log(styleText(["bold", "magenta"], "╚══════════════════════════════════════════════╝\n"));

  const profile = parseArgs();
  const bareMetalServices = BARE_METAL_SERVICES[profile];
  const needsApiDocker = NEEDS_API_DOCKER[profile];

  const description = [
    ...(bareMetalServices.length > 0 ? [`${bareMetalServices.join(", ")} (hot reload)`] : []),
    ...(needsApiDocker ? ["API (Docker)"] : []),
    ...(bareMetalServices.length === 0 && !needsApiDocker ? ["infrastructure only"] : []),
  ].join(" + ");

  log("📋", `Profile: ${styleText("bold", profile)} — ${description}`);
  console.log("");

  // Step 1: Check Docker
  if (!checkDocker()) {
    logError("Docker is not running. Please start Docker Desktop and try again.");
    process.exit(1);
  }
  logSuccess("Docker is running");

  // Step 2: Start infrastructure
  log("🐳", styleText("bold", "Starting Docker infrastructure..."));
  console.log("");

  startManagement();
  startStorage();
  swapExpToBareMetalMode();
  await waitForInfra();
  initDatabases();

  console.log("");
  log("✅", styleText("green", "Infrastructure is ready!"));
  console.log("");

  // Step 3: Print service URLs
  console.log(styleText("gray", "  ┌──────────────────────────────────────────────────┐"));
  console.log(styleText("gray", "  │  Docker Infrastructure                           │"));
  console.log(styleText("gray", "  ├──────────────────────────────────────────────────┤"));
  console.log(styleText("gray", "  │  Traefik Dashboard   http://localhost:8080        │"));
  console.log(styleText("gray", "  │  CosmosDB Explorer   http://localhost:1234         │"));
  console.log(styleText("gray", "  │  SQL Server          localhost:8082                │"));
  console.log(styleText("gray", "  │  Redis               localhost:6379                │"));
  console.log(styleText("gray", "  │  Azurite Blobs       http://localhost:10000        │"));
  console.log(styleText("gray", "  └──────────────────────────────────────────────────┘"));
  console.log("");

  if (bareMetalServices.length === 0 && !needsApiDocker) {
    if (profile === "setup-only") {
      log("✅", styleText("green", "Infrastructure setup complete. Ready for VS Code debugger launch."));
    } else {
      log("ℹ️ ", "Infrastructure-only mode. Start services manually:");
      console.log(styleText("gray", "  npm run dev:website  → https://localhost:3000  (bare-metal, hot reload)"));
      console.log(styleText("gray", "  npm run dev:api      → http://localhost:5000   (bare-metal, hot reload)"));
      console.log(styleText("gray", "  npm run dev:exp      → http://localhost:5002   (bare-metal, hot reload)"));
    }
    console.log("");
    return;
  }

  // Step 4: Start API in Docker (needs Docker DNS to resolve http://exp)
  if (needsApiDocker) {
    startApiInDocker();
    console.log("");
  }

  // Step 5: Start bare-metal services with hot reload
  if (bareMetalServices.length > 0) {
    log("🔧", styleText("bold", "Starting bare-metal services with hot reload..."));
    console.log("");

  const processes = startBareMetalServices(bareMetalServices);

  // Handle graceful shutdown
  const shutdown = (): void => {
    console.log(styleText("yellow", "\n\n🛑 Shutting down bare-metal services..."));
    for (const p of processes) {
      p.kill();
    }
    console.log(styleText("gray", "  Bare-metal services stopped."));
    console.log(styleText("gray", "  Docker infrastructure (and API container) are still running."));
    console.log(styleText("gray", "  To stop Docker: cd infra/Local && ./selfhost-stop.sh (or selfhost-stop.bat)"));
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Wait for any process to exit
  await Promise.race(
    processes.map(
      (p) =>
        new Promise<void>((resolve) => {
          p.on("exit", () => resolve());
        }),
    ),
  );
  } else {
    log("✅", "All services running in Docker. Use Ctrl+C to exit.");
    log("ℹ️ ", "API logs: docker logs -f api-arolariu-ro");
    // Keep process alive
    await new Promise(() => {});
  }
}

main().catch((error) => {
  logError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
