# Development Guide

> Everything you need to start contributing to arolariu.ro — from zero to running code.

## Prerequisites

| Tool | Version | Required | Install |
|------|---------|----------|---------|
| **Git** | ≥ 2.30 | ✅ Yes | [git-scm.com](https://git-scm.com/) — bootstrap prerequisite |
| **Node.js** | ≥ 24 | ✅ Yes | [nodejs.org](https://nodejs.org/) — bootstrap prerequisite; `npm run setup` never installs or upgrades it |
| **npm** | ≥ 11 | ✅ Yes | Bundled with Node.js — bootstrap prerequisite |
| **.NET SDK** | 10.0 | ✅ Yes | Prepared by `npm run setup` (SDK install requires your consent) |
| **Python** | 3.12 | ⬡ Optional | Prepared by `npm run setup` — only for the `exp` service |
| **Container engine** | Rancher Desktop or Podman Desktop | ✅ Yes (for Aspire/selfhost infra) | Selected and, with consent, installed by `npm run setup`; Docker Desktop is not supported |

> **First time?** Clone the repository, then run `npm run setup` — it restores root and `.github/scripts` dependencies, generates
> checkout artifacts, prepares the .NET SDK/AppHost secrets/HTTPS certificate, an isolated Python virtual environment, the website's
> local `.env` defaults, Playwright's Chromium browser, and selects/persists a Rancher Desktop or Podman Desktop container engine. It
> never installs or upgrades Node.js or npm, and it does not build, type-check, test, or start any service. Add `--verbose` for
> diagnostic detail, `--dry-run` to preview every planned mutation, `--yes` to approve system-scoped installs without prompting, and
> `--engine rancher|podman` to select the container engine explicitly.

---

## Choosing Your Development Medium

There are three ways to develop locally. Choose based on your needs:

| | Aspire (default) | Selfhost (Docker Compose) | DevContainer / Codespaces |
|---|---|---|---|
| **Best for** | Day-to-day coding with fast iteration | CI parity, deploy-mock-of-prod, container auditing | Onboarding, cloud dev, consistent env |
| **Hot reload** | ✅ All services (apps run native) | ❌ Production builds, no reload | ✅ All services (Aspire runs inside container) |
| **Infrastructure** | ✅ SQL Server, Cosmos vNext emulator, Azurite, Redis via Aspire-managed containers | ✅ Full containerized stack | ✅ Same as Aspire (Docker-in-Docker) |
| **Setup time** | ~2 min (`npm run setup`) | ~5 min (container build + init) | ~5 min (container build) |
| **Prerequisites** | Git, Node, npm (`npm run setup` prepares .NET + the engine) | Rancher Desktop or Podman Desktop (`npm run setup` prepares the engine) | A Dev Containers-compatible engine + VS Code Dev Containers extension |
| **VS Code integration** | Open `.code-workspace`, press F5 | Open folder (services run in containers) | Automatic — extensions + tools pre-installed |
| **OS support** | Windows, macOS, Linux | Windows, macOS, Linux | Windows, macOS, Linux, browser (Codespaces) |
| **When to use** | Writing code, debugging, unit tests | Container auditing, CI parity, E2E against prod-shape | First day setup, CI environments, Codespaces |

### Recommended workflow

Use **Aspire mode** (`npm run dev`). Aspire 13.x's AppHost (`tooling/AppHost/Program.cs`) runs each app natively (dotnet / Next.js / SvelteKit / Docusaurus / uvicorn) for full hot reload while spawning infrastructure (SQL Server, Cosmos vNext emulator, Azurite, Redis) as Aspire-managed containers. The Aspire dashboard at `https://localhost:17080` surfaces live OTel traces, metrics, and logs.

See **[AGENTS.md → Local Dev — Aspire vs Selfhost](AGENTS.md#local-dev--aspire-vs-selfhost)** for the canonical mode reference.

---

## Quick Start

### 🏆 Recommended: Aspire Mode (apps native + infra in Aspire-managed containers)

This is the primary development workflow — Aspire orchestrates real infrastructure containers while your apps run native with full hot reload.

```bash
# 1. Clone
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro

# 2. One-command onboarding, then confirm workspace health
npm run setup        # restores dependencies; prepares .NET, Python, generated artifacts, and the container engine
npm run doctor       # diagnoses workspace health

# 3. Start everything (Aspire AppHost orchestrates apps + infra)
npm run dev          # ← This is what you'll use every day (alias: npm run dev:aspire)
```

**What `npm run dev` does:**
1. ✅ Runs `dotnet run --project tooling/AppHost` — the Aspire AppHost
2. 🐳 Spawns Aspire-managed containers: SQL Server, Cosmos vNext emulator, Redis, Azurite
3. ⏳ Waits for infra health, initializes schemas
4. 🚀 Starts each app natively with hot reload — dotnet, npm dev scripts, uvicorn
5. 📊 Exposes the Aspire dashboard at `https://localhost:17080` with live OTel traces / metrics / logs

> **Pressing F5 in VS Code / Visual Studio 2026** runs the same AppHost — the only difference is the IDE attaches a debugger.

**Single-service standalone (no AppHost coordination — fallback only):**
```bash
npm run dev:website     # Next.js only — no infra, no AppHost
npm run dev:api         # .NET API only — needs infra running separately
npm run dev:cv          # SvelteKit only
npm run dev:exp         # Python uvicorn only
npm run dev:docs        # Docusaurus only
npm run dev:status      # Status page only
```

Use these when narrowly iterating on a single service and you don't need cross-service coordination.

**After startup, your services are at:**
| Service | URL | Mode |
|---------|-----|------|
| Website | https://localhost:3000 | ✅ Native, Turbopack hot reload |
| API | http://localhost:5000 | ✅ Native, .NET Hot Reload |
| exp | http://localhost:5002 | ✅ Native, uvicorn --reload |
| CV | http://localhost:4173 | ✅ Native, Vite HMR |
| docs | http://localhost:3100 | ✅ Native, Docusaurus dev |
| status | http://localhost:3002 | ✅ Native, SvelteKit (AddViteApp) |

**Infrastructure dashboards:**
| Service | URL |
|---------|-----|
| Aspire Dashboard | https://localhost:17080 |
| CosmosDB Explorer | http://localhost:1234 |
| SQL Server | localhost:8082 (credentials surfaced via Aspire dashboard) |
| Redis | localhost:6379 |
| Azurite Blobs | http://localhost:10000 |

**Stopping:**
- `Ctrl+C` in the AppHost terminal — Aspire tears down both native apps and managed containers.
- If anything is stranded, `docker ps` then `docker stop` the leftover container(s).

#### Validating everything works

After starting, run these checks:

```bash
# Check service health
curl -k http://localhost:5002/api/health     # exp: should return {"status":"Healthy"}
curl -k http://localhost:5000/health          # API: should return {"status":"Healthy"}
curl -k https://localhost:3000               # Website: should return HTML

# Check Docker container status (Aspire-managed)
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check workspace health
npm run doctor
```

#### Troubleshooting Aspire mode

| Problem | Cause | Fix |
|---------|-------|-----|
| Container runtime is not running | The selected engine (Rancher Desktop or Podman Desktop — see `.arolariu/tooling.local.json`) is not started | Start that engine and wait for it to initialize. Docker Desktop is not a supported fallback |
| AppHost fails on startup | Stale containers from prior session | `docker ps` then `docker stop` lingering `aspire-*` containers and retry |
| API crashes on startup | Infra container not yet healthy | The AppHost has `WaitFor` dependencies — wait ~30s on first run while SQL/Cosmos initialize |
| Website shows blank page | Turbopack compiling | Wait 10-15s for initial compilation, then refresh |
| Port already in use | Previous dev session didn't clean up | `npm run doctor` checks ports. Kill stale processes or restart the selected container engine |
| CosmosDB Explorer not loading | Emulator still initializing | Wait 60s after AppHost start, Cosmos vNext takes time to start |
| SQL schema errors | Schema already exists | Safe to ignore "already exists" messages |
| Want the legacy fully-containerized stack | Auditing, CI parity, deploy-mock-of-prod | Use `npm run dev:selfhost` (see Alternative below) |

---

### Alternative: Bare-Metal Single Service (no container engine, no AppHost)

For frontend-only work where you don't need databases:

```bash
npm run setup
npm run generate:env  # creates .env with sensible defaults
npm run dev:website       # Just the website with hot reload
```

**Hot reload behavior per service:**

| Service | Technology | What reloads instantly | What requires restart |
|---------|------------|----------------------|---------------------|
| Website | Next.js Turbopack | Components, pages, styles, server actions | `next.config.ts`, middleware, env vars |
| API | `dotnet watch` | Controllers, services, DTOs | Startup config, DI registration, NuGet changes |
| exp | `uvicorn --reload` | All Python files | `requirements.txt` changes |
| Components | `rslib --watch` | Component source files | `rslib.config.ts` changes |
| CV | Vite HMR | Svelte components, styles | `svelte.config.js`, `vite.config.js` |

> **Note:** Without a running container engine, the API will build and start but crash because it can't reach CosmosDB/SQL. This is fine for frontend-only work.

---

### Alternative: Selfhost Mode (full containerized stack)

For integration testing, CI parity, or auditing container behavior — everything (apps + infra) runs in containers via the engine
`npm run setup` selected (Rancher Desktop or Podman Desktop; Docker Desktop is not supported). Export `MSSQL_SA_PASSWORD` in your
shell/session before starting — selfhost's SQL bootstrap requires it, it is never stored in `.env` or `.arolariu/tooling.local.json`,
and it is not forwarded by `npm run setup`'s own child processes.

```bash
npm run dev:selfhost       # Brings up the full Docker Compose stack
npm run dev:selfhost:stop  # Tears it down
```

> **Note:** Docker containers run production builds — no hot reload. For active coding, use Aspire mode above.

See [infra/Local/readme.md](infra/Local/readme.md) for full Compose details.

---

### Alternative: DevContainer / GitHub Codespaces

For new developers or cloud-based development:

1. Open the repo in VS Code → "Reopen in Container"
2. Container pre-installs Node 24, .NET 10, Python 3.12, and 28 VS Code extensions
3. Run `npm run dev` inside the container (Docker-in-Docker is enabled — Aspire spawns infra containers as siblings)

**GitHub Codespaces:** Go to the repo → Code → Codespaces → Create codespace

**Pre-installed:** Node 24, .NET 10, Python 3.12, Docker, Azure CLI, Playwright
**Forwarded ports:** 3000, 5000, 5002, 5173, 6006, 7007, 8080, 9229

---

## Developer Roles & Workspaces

Open the workspace file that matches your role for a tailored VS Code experience with pre-configured extensions, debug profiles, and tasks:

| Role | Workspace File | What You'll Work On |
|------|---------------|---------------------|
| **Frontend** | `.vscode/frontend.code-workspace` | Next.js website, component library, CV site |
| **Backend** | `.vscode/backend.code-workspace` | .NET API, Python exp service |
| **Fullstack** | `.vscode/fullstack.code-workspace` | Everything — includes compound debug configs |

**To open:** File → Open Workspace from File → select the `.code-workspace` file.

---

## Service Map

| Service | Port | Dev Command | Hot Reload | Health Check |
|---------|------|-------------|------------|--------------|
| **Website** (Next.js) | 3000 | `npm run dev:website` | ✅ Turbopack HMR | http://localhost:3000 |
| **API** (.NET) | 5000 | `npm run dev:api` | ✅ dotnet watch | http://localhost:5000/health |
| **exp** (Python FastAPI) | 5002 | `npm run dev:exp` | ✅ uvicorn --reload | http://localhost:5002/api/health |
| **Components** (rslib) | — | `npm run dev:components` | ✅ rslib watch | _watch mode, no server_ |
| **CV Site** (SvelteKit) | 5173 | `npm run dev:cv` | ✅ Vite HMR | http://localhost:5173 |

> **Storybook** for interactive component development is available via the website workspace: `cd sites/arolariu.ro && npm run storybook` (port 6006).

### Docker Compose Services (when using Option B)

| Service | URL | HTTPS URL |
|---------|-----|-----------|
| Website | http://localhost:3000 | https://website.localhost |
| API | http://localhost:5000 | https://api.localhost |
| exp Admin | http://localhost:5002/admin | — |
| CosmosDB Explorer | http://localhost:1234 | — |
| Traefik Dashboard | http://localhost:8080 | https://traefik.localhost |
| SQL Server | localhost:8082 | — |
| Redis | localhost:6379 | — |

---

## Common Commands

### Development

```bash
npm run dev              # Aspire mode — full stack (apps native + infra in Aspire-managed containers)
npm run dev:aspire       # Explicit alias for npm run dev
npm run dev:selfhost     # Selfhost mode — fully containerized via Docker Compose
npm run dev:website      # Next.js website standalone (no AppHost)
npm run dev:api          # .NET API standalone (no AppHost; needs infra separately)
npm run dev:exp          # Python exp service standalone
npm run dev:components   # Component library watch mode
npm run dev:cv           # SvelteKit CV site standalone
```

### Testing

```bash
npm run test             # All tests
npm run test:website     # Website unit tests (Vitest)
npm run test:api         # API tests (MSTest)
npm run test:exp         # exp tests (pytest)
npm run test:unit        # All unit tests
npm run test:e2e         # All E2E tests (Playwright + Newman)
```

### Code Quality

```bash
npm run lint             # ESLint (20+ plugins)
npm run format           # Prettier formatting
npm run doctor           # Workspace health diagnostics
npm run status           # Monorepo status dashboard
```

### Build

```bash
npm run build            # Build all projects
npm run build:website    # Build Next.js website
npm run build:api        # Build .NET API
npm run build:components # Build component library
```

### Code Generation

```bash
npm run generate         # Generate all (env, i18n, GraphQL)
npm run generate:env     # Environment files only
npm run generate:i18n    # i18n translation sync
npm run generate:gql     # GraphQL type generation
```

---

## Environment Variables

### How Config Works

In production and Docker, all runtime config flows through the **exp** service — the website and API fetch config values from `http://exp/api/v1/config` at runtime.

For bare-metal local development, environment variables are set via `sites/arolariu.ro/.env`, which `npm run setup` additively
populates with core local defaults (`SITE_ENV`, `SITE_NAME`, `SITE_URL`, `USE_CDN`) without overwriting existing entries, or via `.env`
files generated by `npm run generate:env`.

### Required Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `SITE_ENV` | Website | `DEVELOPMENT` or `PRODUCTION` |
| `SITE_URL` | Website | `https://localhost:3000` locally |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Website | Optional Clerk publishable key (get a matching test/live pair from [clerk.com](https://clerk.com)) |
| `CLERK_SECRET_KEY` | Website | Optional Clerk secret key — without a valid, mode-matched pair, authenticated website features stay degraded, but `npm run setup` still exits `0` |
| `ASPNETCORE_ENVIRONMENT` | API | `Development` |

> **Tip:** Run `npm run generate:env` to auto-create `.env` files with sensible defaults. See `.env.example` for the monorepo-wide reference, and the per-app `.env.example` files for service-specific values.

---

## Debugging

All services support **debugging with breakpoints** AND **hot reload simultaneously** from VS Code.

### Quick Start: Debug Any Service

1. Open a `.code-workspace` file for your role (or the repo root)
2. Go to **Run & Debug** panel (`Ctrl+Shift+D`)
3. Select a debug profile from the dropdown
4. Press `F5` to start debugging
5. Set breakpoints by clicking the gutter (left of line numbers)

### Debug Profiles

| Profile | Service | Breakpoints | Hot Reload | Workspace |
|---------|---------|-------------|------------|-----------|
| **Next.js: Debug Full Stack** | Website | ✅ Server + client | ✅ Turbopack HMR | Root, Frontend, Fullstack |
| **Next.js: Debug Client-Side** | Website (browser) | ✅ Client components | ✅ Turbopack HMR | Root |
| **.NET API: Debug** | API | ✅ C# breakpoints | ✅ Hot Reload on save | Root, Backend, Fullstack |
| **Python: exp FastAPI** | exp | ✅ Python breakpoints | ✅ uvicorn --reload | Root, Backend, Fullstack |
| **SvelteKit: CV Debug** | CV site | ✅ Server-side | ✅ Vite HMR | Frontend, Fullstack |
| **Full Stack: Website + API + exp** | All three | ✅ All | ✅ All | Root, Fullstack |

### How Each Service Achieves Debug + Hot Reload

**Website (Next.js):**
- Debugger: Node.js `--inspect` flag attaches VS Code's debugger
- Hot reload: Turbopack Fast Refresh runs independently of the debugger
- Both work simultaneously — edit a component, see it refresh, hit breakpoints in server actions

**API (.NET):**
- Debugger: C# DevKit launches and attaches automatically
- Hot reload: C# DevKit's built-in Hot Reload applies changes on save (no `dotnet watch` needed)
- Setting `dotnet.hotReload.applyOnSave: true` is pre-configured in backend/fullstack workspaces
- Edit a controller → save → changes apply without restart → breakpoints continue working

**exp (Python FastAPI):**
- Debugger: debugpy attaches to the uvicorn process
- Hot reload: `--reload` flag makes uvicorn watch for file changes
- Both work simultaneously — edit a route, uvicorn restarts, debugpy re-attaches

**CV (SvelteKit):**
- Debugger: Node.js `--inspect` attaches to Vite dev server
- Hot reload: Vite HMR runs independently
- Set breakpoints in `+page.server.ts` load functions and API routes

### One-Click Full Stack Debug

The **"Full Stack: Website + API + exp"** compound is a true one-click experience:

1. **Press F5** (or select from the debug dropdown)
2. The `preLaunchTask` automatically starts Docker infrastructure (CosmosDB, SQL, Redis, Azurite)
3. All three services launch with debuggers attached
4. Set breakpoints across the entire stack — Next.js → .NET API → Python exp

No manual Docker setup required. If Docker infra is already running, the preLaunchTask completes in ~3 seconds.

**What you can do:**
- Set a breakpoint in a Next.js server action
- Set a breakpoint in the .NET controller it calls
- Set a breakpoint in the exp config endpoint
- Step through the entire request chain across all three services
- Edit code → hot reload applies → breakpoints continue working

### VS Code Tasks

Run tasks from the Command Palette (`Ctrl+Shift+P` → "Tasks: Run Task"):

- **Infra: Setup Docker** — starts Docker infrastructure (used automatically by debug compound)
- **Dev: Website** / **Dev: API** / **Dev: exp Service** — start individual services (no debugger)
- **Dev: All Services** — start everything in parallel (no debugger)
- **Docker: Start/Stop Local Stack** — manage Docker Compose environment
- **Tests:** / **Checks:** — run tests and code quality tools
- **Health: Doctor Check** — diagnose workspace issues

---

## Architecture Overview

```
arolariu.ro/
├── packages/
│   └── components/          # @arolariu/components — shared UI library
├── sites/
│   ├── arolariu.ro/         # Next.js 16 website (main frontend)
│   ├── api.arolariu.ro/     # .NET 10 API (DDD + The Standard)
│   ├── exp.arolariu.ro/     # Python FastAPI (config & feature flags)
│   ├── cv.arolariu.ro/      # SvelteKit CV site (standalone)
│   └── docs.arolariu.ro/    # DocFX documentation
├── infra/
│   ├── Azure/Bicep/         # Infrastructure as Code
│   ├── Local/               # Docker Compose local stack
│   └── containers/          # Dockerfiles
├── scripts/                 # Build & utility scripts
├── docs/rfc/                # Architecture Decision Records
└── .vscode/                 # Editor config + workspace profiles
```

### Dependency Flow

```
@arolariu/components (shared UI)
        ↓ imports
sites/arolariu.ro ←── API calls ──→ sites/api.arolariu.ro
        │                                    ↓
        └── config from ──→ sites/exp.arolariu.ro ←── config from ──┘
```

> **Key principle:** The CV site (`sites/cv.arolariu.ro`) is fully standalone with zero cross-dependencies.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm run setup` fails | Confirm Git, Node 24+, and npm 11+ are installed, then rerun `npm run setup --verbose` for per-phase evidence |
| Port 3000 in use | Stop other dev servers or change port: `PORT=3001 npm run dev:website` |
| .NET API won't start | Run `npm run generate:env` first — API needs config from exp or env vars |
| Python not found | Rerun `npm run setup --yes` to install Python 3.12 with consent, or install it yourself (only needed for the exp service) |
| Containers won't start | Ensure the selected container engine (Rancher Desktop or Podman Desktop — Docker Desktop is not supported) is running and ports 3000/5000/5002 are free |
| TypeScript errors on build | Run `npm run generate` to regenerate types and env files |
| Tests failing | Run `npm run doctor` to diagnose workspace health |
| HTTPS certificate errors | See [infra/Local/readme.md](infra/Local/readme.md) for mkcert setup |
| `*.localhost` not resolving (Windows, selfhost mode) | Add entries to `C:\Windows\System32\drivers\etc\hosts` — see Docker setup docs |

---

## Further Reading

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — PR workflow, branch naming, commit conventions
- **[docs/rfc/](docs/rfc/)** — Architecture decisions (RFCs 1xxx=frontend, 2xxx=backend)
- **[infra/Local/readme.md](infra/Local/readme.md)** — Full Docker Compose setup guide
- **[AGENTS.md](AGENTS.md)** — AI agent guidance for the monorepo
- **[README.md](README.md)** — Project overview and live service links
