# Development Guide

> Everything you need to start contributing to arolariu.ro — from zero to running code.

## Prerequisites

| Tool | Version | Required | Install |
|------|---------|----------|---------|
| **Node.js** | ≥ 24 | ✅ Yes | [nodejs.org](https://nodejs.org/) or `npm run setup` |
| **npm** | ≥ 11 | ✅ Yes | Bundled with Node.js |
| **.NET SDK** | 10.0 | ✅ Yes | [dot.net](https://dot.net/) or `npm run setup` |
| **Python** | 3.12 | ⬡ Optional | [python.org](https://python.org/) — only for exp service |
| **Docker** | ≥ 20.10 | ⬡ Optional | [docker.com](https://docker.com/) — for local infra stack |
| **Git** | ≥ 2.30 | ✅ Yes | [git-scm.com](https://git-scm.com/) |

> **First time?** Run `npm run setup` — it checks and installs Node.js, .NET, and npm automatically.

---

## Quick Start

### Option A: Bare-Metal Development (Recommended)

```bash
# 1. Clone and install
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install

# 2. Validate your environment
npm run setup        # checks and installs prerequisites
npm run doctor       # diagnoses workspace health

# 3. Generate environment files
npm run generate     # creates .env, i18n files, GraphQL types

# 4. Start developing
npm run dev:website  # Next.js → http://localhost:3000
npm run dev:api      # .NET API → http://localhost:5000 (with hot reload)
npm run dev          # all services in parallel (requires Python for exp)
```

> **Don't have Python?** That's fine — just run services individually:
> `npm run dev:website` and `npm run dev:api`. The exp service is only needed for runtime config resolution and feature flags.

### Option B: Docker Compose (Full Stack with Infrastructure)

Runs everything in containers with real database emulators (CosmosDB, SQL Server, Redis, Azurite).

```bash
# 1. Clone and install
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install

# 2. Configure secrets
cp sites/exp.arolariu.ro/config.template.json sites/exp.arolariu.ro/config.docker.json
# Edit config.docker.json with your Clerk keys (or use defaults for non-auth testing)

# 3. Start the full stack
cd infra/Local
./selfhost-start.sh    # Linux/macOS
selfhost-start.bat     # Windows
```

See [infra/Local/readme.md](infra/Local/readme.md) for full Docker setup details.

### Option C: DevContainer / GitHub Codespaces

Open the repository in VS Code and select **"Reopen in Container"** (requires Docker + VS Code Dev Containers extension). The container pre-installs Node 24, .NET 10, Python 3.12, and all VS Code extensions.

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

## Hot Reload Reference

All services support hot reload in dev mode — your changes appear instantly without manual restarts.

| Service | Technology | What Reloads | What Requires Restart |
|---------|------------|--------------|----------------------|
| **Website** | Next.js Turbopack | Components, pages, styles, server actions | `next.config.ts`, middleware, env vars |
| **API** | `dotnet watch` | Controllers, services, DTOs, Razor | Startup config, DI registration, NuGet changes |
| **exp** | `uvicorn --reload` | All Python files | `requirements.txt` changes |
| **Components** | rslib watch | Component source files | `rslib.config.ts` changes |
| **CV** | Vite HMR | Svelte components, styles | `svelte.config.js`, `vite.config.js` |

---

## Common Commands

### Development

```bash
npm run dev              # Start all services in parallel
npm run dev:website      # Next.js website only
npm run dev:api          # .NET API with hot reload
npm run dev:exp          # Python exp service with reload
npm run dev:components   # Component library watch mode
npm run dev:cv           # SvelteKit CV site
```

### Testing

```bash
npm run test             # All tests
npm run test:website     # Website unit tests (Vitest)
npm run test:api         # API tests (xUnit)
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

For bare-metal local development, environment variables are set via `.env` files generated by `npm run generate:env`.

### Required Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `SITE_ENV` | Website | `DEVELOPMENT` or `PRODUCTION` |
| `SITE_URL` | Website | `http://localhost:3000` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Website | Clerk auth (get from [clerk.com](https://clerk.com)) |
| `CLERK_SECRET_KEY` | Website | Clerk secret key |
| `ASPNETCORE_ENVIRONMENT` | API | `Development` |

> **Tip:** Run `npm run generate:env` to auto-create `.env` files with sensible defaults. See `sites/arolariu.ro/.env.example` for the full list.

---

## Debugging

### VS Code Debug Configurations

The workspace files include pre-configured debug profiles:

| Profile | What It Debugs | Workspace |
|---------|---------------|-----------|
| **Next.js: Dev Server** | Full-stack Next.js with breakpoints | Frontend, Fullstack |
| **.NET API: Run with Hot Reload** | C# API with breakpoints + hot reload | Backend, Fullstack |
| **Python: exp FastAPI** | Python service with breakpoints + reload | Backend, Fullstack |
| **Full Stack: Website + API** | Both services simultaneously | Fullstack |
| **Storybook: Components** | Component library development | Frontend |

### VS Code Tasks

Run tasks from the Command Palette (`Ctrl+Shift+P` → "Tasks: Run Task"):

- **Dev: Website** / **Dev: API** / **Dev: exp Service** — start individual services
- **Dev: All Services** — start everything in parallel
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
| `npm run setup` fails | Install Node 24+ and .NET 10 manually, then retry |
| Port 3000 in use | Stop other dev servers or change port: `PORT=3001 npm run dev:website` |
| .NET API won't start | Run `npm run generate:env` first — API needs config from exp or env vars |
| Python not found | Install Python 3.12 (only needed for exp service) |
| Docker containers won't start | Ensure Docker Desktop is running and ports 3000/5000/5002 are free |
| TypeScript errors on build | Run `npm run generate` to regenerate types and env files |
| Tests failing | Run `npm run doctor` to diagnose workspace health |
| HTTPS certificate errors | See [infra/Local/readme.md](infra/Local/readme.md) for mkcert setup |
| `*.localhost` not resolving (Windows) | Add entries to `C:\Windows\System32\drivers\etc\hosts` — see Docker setup docs |

---

## Further Reading

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — PR workflow, branch naming, commit conventions
- **[docs/rfc/](docs/rfc/)** — Architecture decisions (RFCs 1xxx=frontend, 2xxx=backend)
- **[infra/Local/readme.md](infra/Local/readme.md)** — Full Docker Compose setup guide
- **[AGENTS.md](AGENTS.md)** — AI agent guidance for the monorepo
- **[README.md](README.md)** — Project overview and live service links
