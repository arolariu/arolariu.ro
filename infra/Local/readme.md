# arolariu.ro Local Development Environment

## Overview

Two coexisting modes for local development.

### Mode 1: Aspire (default — `npm run dev -- --engine <rancher|podman>`)

> [!WARNING]
> Aspire's scenario bootstrap deletes all documents in the guarded local
> invoice/merchant Cosmos containers, removes the local invoice blob container,
> and clears the analysis queue before restoring Alice, Bob, and Charlie.
> Preserve or export any local work before starting. Selfhost does not run this
> scenario reset.

Recommended for normal development. The .NET Aspire AppHost (under `tooling/AppHost`)
declares and orchestrates everything natively:

- **Infrastructure**: SQL Server, the Cosmos preview emulator, Azurite, and Redis are spawned through Aspire integrations (`AddSqlServer`, `AddAzureCosmosDB().RunAsPreviewEmulator()`, and related resources) on the selected Rancher Desktop or Podman Desktop engine.
- **Configuration overlay**: Aspire copies the developer-owned `sites/exp.arolariu.ro/config.docker.json` into ignored `config.aspire.json`, then overlays Aspire-specific endpoints and credentials. Selfhost and Aspire do not rely on identical injected values.
- **Native website HTTPS**: Aspire runs the website's
  `next dev --experimental-https` script. On a certificate-free first run,
  Next.js can download/run certificate tooling and install a local CA; confirm
  that trust-store change before starting.
- **Apps as native processes**: exp (Python uvicorn via `AddUvicornApp`), API (.NET via `AddProject`), Website (Next.js via `AddNextJsApp`), CV/status (SvelteKit via `AddViteApp`), docs (Docusaurus via `AddJavaScriptApp`). Hot reload preserved.
- **Direct service URLs**: api → `http://localhost:5000`, website → `https://localhost:3000`, exp → `http://localhost:5002`, cv → `http://localhost:4173`, docs → `http://localhost:3100`, status → `http://localhost:3002`.
- **Aspire dashboard**: live OTel traces / metrics / logs at `https://localhost:17080`.

In Aspire mode, the `infra/Local/{Storage,Backend,Frontend}/docker-compose.yml` files are NOT used — Aspire spawns its own containers directly.

### Mode 2: Selfhost (advanced — `npm run dev:selfhost -- --engine <rancher|podman>`)

Everything containerized via the selected Rancher Desktop or Podman Desktop Compose provider, including apps. Used for:
- Auditing container behavior
- CI parity validation
- Testing deploy-mock-of-prod configurations

The Selfhost flow is the rest of this README. It starts the Management + Storage + Backend + Frontend Compose stacks (with `--profile selfhost` to include containerized exp + apps). Docker Desktop is deprecated and is not a supported local runtime for this repository.

---

## Selfhost mode — full setup

This repository contains a complete containerized development environment for the arolariu.ro project. The setup uses an engine-aware Compose wrapper to orchestrate multiple containers organized in logical groups (Management, Storage, Backend, Frontend), allowing developers to run the entire stack locally with Rancher Desktop or Podman Desktop.

## Architecture

The local environment is organized into four main container groups:

1. **Management** — Traefik reverse proxy with dashboard

2. **Storage** — Data persistence and configuration
   - `exp.arolariu.ro` — experimentation / config proxy (serves all runtime config)
   - Microsoft SQL Server (auth database)
   - CosmosDB vNext emulator (invoice document store)
   - Azurite (blob storage emulator)
   - Redis cache

3. **Backend** — `sites/api.arolariu.ro` containerized API service

4. **Frontend** — `sites/arolariu.ro` containerized Next.js website

### Service dependency flow

```
Frontend (localhost:3000)  →  exp (http://exp:80)  ←  Backend (localhost:5000)
     ↓                            ↓                        ↓
   Clerk Auth               config.docker.json         CosmosDB / SQL / Azurite
```

The API and website fetch their indexed runtime configuration from the exp
service. Each consumer applies its own typed cache/refresh behavior; application
containers do not embed the environment-specific values in source.

## Prerequisites

- **Rancher Desktop** in Moby/dockerd mode, or **Podman Desktop** with `podman compose`
- Docker Desktop is deprecated and is not a supported local runtime for this repository
- **Node.js** ≥ 24 and **npm** ≥ 11 (for Azurite blob container init)
- **Git** (to clone the repository)
- `MSSQL_SA_PASSWORD` environment variable for the local SQL Server container. Keep it in your shell/session environment only; do not commit it to `.env` files, launch profiles, or source control.
- 4GB+ RAM available for containers
- 10GB+ of free disk space
- _(Optional)_ **mkcert** installed separately for browser-trusted selfhost HTTPS. Without it, startup continues with Traefik's default self-signed certificate.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install
```

### 2. Decide whether to use trusted local HTTPS certificates

The startup script never installs the `mkcert` executable. If `mkcert` is
already available and the selfhost certificates are missing, startup runs
`mkcert -install` and generates a `*.localhost` certificate for Traefik. That
command changes the local trust store, so acknowledge that security-sensitive
effect before the first run.

- **With mkcert installed and approved**: the local CA and certificates are
  created, then reused from `Management/certs/`.
- **Without mkcert**: startup continues and Traefik uses its default
  self-signed certificate.
- **To install mkcert**: follow its upstream installation guide separately;
  dependency installation is not part of repository startup.

Certificates in `Management/certs/` are gitignored.

### 3. Create local config files

The exp service needs a local config file with your secrets:

```bash
cd sites/exp.arolariu.ro
cp config.template.json config.docker.json
# Edit config.docker.json with your real values (Clerk keys, etc.)
```

The frontend needs Clerk keys for Docker Compose:

```bash
cd infra/Local/Frontend
# Create .env with your Clerk keys:
echo 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY' > .env
echo 'CLERK_SECRET_KEY=sk_test_YOUR_KEY' >> .env
```

Both files are gitignored — they will never be committed.

### 4. Start the environment

Aspire and selfhost have different data effects. The warning above applies to
Aspire; selfhost performs provisioning without the deterministic scenario
reset.

```bash
npm run dev:selfhost -- --engine rancher
npm run dev:selfhost -- --engine podman
```

PowerShell example:

```powershell
$env:MSSQL_SA_PASSWORD = "<local strong password>"
npm run dev:selfhost -- --engine rancher
```

The startup process:

1. Starts Management containers (Traefik)
2. Starts Storage containers (SQL, CosmosDB, Azurite, Redis, **exp**) detached
3. Waits a fixed ten seconds before invoking storage/bootstrap steps; this is
   not a Compose health-readiness gate
4. Performs the current SQL/Cosmos/Azurite provisioning
5. Starts the Backend and Frontend Compose projects detached

The root wrapper then exits while Compose keeps running. Use Compose `ps`,
health status, and logs to establish readiness; container existence alone is
not sufficient.

### Accessing Services

| Service | URL | HTTPS URL | Notes |
|---------|-----|-----------|-------|
| **Website** | http://localhost:3000 | https://website.localhost | Auth via Clerk |
| **API Health** | http://localhost:5000/health | https://api.localhost/health | Shows dependency status |
| **exp Health** | http://localhost:5002/api/health | — | Config service diagnostics |
| **exp Admin** | http://localhost:5002/admin | — | Config editor (local only) |
| **CosmosDB Explorer** | http://localhost:1234 | — | vNext emulator data explorer |
| **Azurite Blobs** | http://localhost:10000 | — | Blob storage (public read) |
| **SQL Server** | localhost:8082 | — | User: `sa`; password comes from shell variable `MSSQL_SA_PASSWORD` |
| **Redis** | localhost:6379 | — | Local password authentication is enabled; use the injected runtime configuration |
| **Traefik Dashboard** | http://localhost:8080 | https://traefik.localhost | Reverse proxy routes |

### How config flows locally

1. **exp** loads `config.docker.json` at startup (contains all config keys)
2. **API** fetches its indexed configuration values from `http://exp/api/v1/config`
3. **Website** fetches config keys on demand from `http://exp/api/v1/config`
4. **Ordinary website config values** use the server-declared refresh interval
   in the process-local cache, with stale fallback while its circuit breaker is
   open
5. **Feature flags** invalidate their config cache before each read and fall
   back to their defined defaults when exp is unavailable
6. Changes via the **admin UI** become visible after the affected consumer
   refreshes or invalidates its cache

### Changing config at runtime

Open http://localhost:5002/admin to view and edit config values. Changes are
ephemeral (reset on container restart). Consumers may retain a value until its
current refresh interval expires; feature-flag reads refresh on each request.

## Container runtime engines

### Rancher Desktop engine

Rancher Desktop is a supported Docker Desktop replacement for local development.

Required setup:

1. Install Rancher Desktop.
2. Select the Moby/dockerd container engine for the first supported migration path.
3. Ensure Docker Desktop is stopped.
4. Verify Rancher owns the Docker-compatible CLI:

```powershell
docker version
```

The output must identify Rancher Desktop or a Rancher-managed backend, not Docker Desktop.

Run selfhost:

```powershell
npm run dev:selfhost -- --engine rancher
npm run dev:selfhost:stop -- --engine rancher
```

Run Aspire:

```powershell
npm run dev:aspire -- --engine rancher
```

Rancher Desktop runs Aspire through its Moby/Docker-compatible backend, so the effective Aspire runtime value is `docker`.
Rancher Desktop is selected through its Moby/Docker-compatible backend; Aspire/DCP sees this as `docker`, not as a separate `rancher-desktop` runtime.
Ensure your editor process can find the selected runtime on PATH before using VS Code F5 profiles; the repository launch profiles do not hardcode OS-specific install paths.

Docker Desktop is not a supported runtime for this repository.

### Podman Desktop engine

Podman Desktop is a supported Docker Desktop replacement for local development.

Required setup:

1. Install Podman Desktop.
2. Create and start a Podman machine.
3. Enable or install a Compose provider so `podman compose version` succeeds.
4. Ensure Docker Desktop is stopped.

Verify:

```powershell
podman --version
podman compose version
```

If `podman compose version` reports a provider under `C:\Program Files\Docker\...`, install `podman-compose`
and point Podman at it:

```powershell
python -m pip install --user podman-compose
$env:PODMAN_COMPOSE_PROVIDER = "<path-to-podman-compose.exe>"
```

Run selfhost:

```powershell
npm run dev:selfhost -- --engine podman
npm run dev:selfhost:stop -- --engine podman
```

Run Aspire:

```powershell
npm run dev:aspire -- --engine podman
```

All Podman selfhost commands go through `podman`; they must not call Docker Desktop.

### Ad hoc Compose spin-ups

Use the runtime wrapper instead of calling Docker Desktop:

```powershell
npm run containers:compose -- --engine rancher --file infra/Local/Storage/docker-compose.yml -- up -d
npm run containers:compose -- --engine podman --file infra/Local/Storage/docker-compose.yml -- up -d
```

Every command uses the selected engine adapter. The helper does not support `--engine docker`.

## Stopping the Environment

```bash
npm run dev:selfhost:stop -- --engine rancher
npm run dev:selfhost:stop -- --engine podman
```

The stop wrapper runs Compose `down` for every project without `--volumes`.
Named Azurite and Redis volumes survive ordinary teardown. SQL Server and
Cosmos currently have no named data-volume mappings, so their container-layer
state is not reattached after `down`. Confirm that persistence boundary before
stopping a stack that contains local work.

## HTTPS via Traefik + mkcert

The local stack uses Traefik as a reverse proxy. When approved and available,
`mkcert` supplies browser-trusted certificates for `*.localhost`; otherwise
Traefik falls back to its default self-signed certificate.

### How it works

```
Browser ──HTTPS──▸ Traefik (:443) ──HTTP──▸ website (:3000)
                       │                   api (:8080)
                       │                   cosmosdb (:8081)
                       │                   ...
                       ▼
            mkcert local CA ──▸ certs/local-cert.pem
                               certs/local-key.pem
```

1. On the approved first trusted-certificate run, `mkcert -install` installs a
   local Certificate Authority into the OS/browser trust store
2. A wildcard certificate for `*.localhost` is generated and mounted into Traefik
3. Traefik's **file provider** loads the cert via `traefik/dynamic/tls.yml`
4. All services use `tls=true` labels — Traefik presents the mkcert cert
5. HTTP→HTTPS redirect is enabled on the `:80` entrypoint

### Available HTTPS routes

| Route | Service |
|-------|---------|
| `https://website.localhost` | Next.js website |
| `https://api.localhost` | .NET API |
| `https://traefik.localhost` | Traefik dashboard |
| `https://health.localhost` | Healthchecks dashboard |
| `https://mssql.localhost` | SQL Server |
| `https://cosmosdb.localhost` | CosmosDB emulator |
| `https://azurite-blob.localhost` | Azurite blob storage |

### Why not Let's Encrypt ACME?

ACME requires a publicly resolvable domain — `*.localhost` never resolves externally. The `mkcert` approach gives browser-trusted certs without needing a real domain, DNS, or public internet access.

### OS compatibility

| OS | `*.localhost` DNS | HTTPS routes |
|----|-------------------|--------------|
| **macOS / Linux** | ✅ Resolves automatically (RFC 6761) | Work out of the box |
| **Windows** | ❌ Does not resolve subdomains | Use direct `localhost:PORT` URLs, or add entries to `C:\Windows\System32\drivers\etc\hosts` |

Windows hosts file entries are optional and require administrator approval:
```
127.0.0.1  traefik.localhost website.localhost api.localhost health.localhost
```

> Use:
> Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n# arolariu.ro local development (Traefik HTTPS)`n127.0.0.1  traefik.localhost website.localhost api.localhost health.localhost cosmosdb.localhost azurite-blob.localhost redis.localhost" -Encoding ASCII

### Regenerating certificates

Confirm the trust-store and certificate-file changes before regenerating:

```bash
cd infra/Local/Management/certs
mkcert -key-file local-key.pem -cert-file local-cert.pem "localhost" "*.localhost"
npm run dev:selfhost:stop -- --engine rancher
npm run dev:selfhost -- --engine rancher
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port conflicts | Ensure ports 3000, 5000, 5002, 8081, 8082, 10000 are free |
| `exp` not starting | Check `config.docker.json` exists and is valid JSON |
| Clerk auth errors | Verify Clerk keys in `Frontend/.env` match your Clerk dashboard |
| Scan images not loading | Ensure the current selfhost bootstrap configured Azurite CORS and the required container |
| Invoice creation fails | Check CosmosDB containers exist with correct partition keys |
| API health unhealthy | Use the root application logs first, then inspect the owning Storage or Management Compose project for the first unhealthy dependency |
| Container build stale | Use `npm run containers:compose -- --engine rancher --file infra/Local/Backend/docker-compose.yml -- up -d --build --force-recreate` |

### Viewing logs

```bash
npm run dev:selfhost:logs -- --engine rancher
npm run dev:selfhost:logs -- --engine podman
```

The root logs action tails only the selfhost application containers (`exp`,
API, and website). For SQL, Cosmos, Azurite, Redis, or Traefik, run the
`containers:compose` wrapper with the owning Compose file and an exact
`ps`/`logs` operation.

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) file for details.
