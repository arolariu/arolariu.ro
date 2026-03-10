# arolariu.ro Local Development Environment

## Overview

This repository contains a complete containerized development environment for the arolariu.ro project. The setup uses Docker Compose to orchestrate multiple containers organized in logical groups (Management, Storage, Backend, Frontend), allowing developers to run the entire stack locally.

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

Both the API and website fetch ALL runtime configuration (JWT secrets, database
endpoints, feature flags, etc.) from the exp service. No config is hardcoded in
the application containers.

## Prerequisites

- **Docker** (20.10.0 or higher) with Docker Compose v2
- **Node.js** ≥ 24 and **npm** ≥ 11 (for Azurite blob container init)
- **Git** (to clone the repository)
- 4GB+ RAM available for containers
- 10GB+ of free disk space
- _(Optional)_ **mkcert** — auto-installed by startup scripts for local HTTPS; install manually if auto-install fails ([guide](https://github.com/FiloSottile/mkcert#installation))

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install
```

### 2. Set up local HTTPS certificates (automatic)

The startup scripts automatically install [mkcert](https://github.com/FiloSottile/mkcert) and generate locally-trusted TLS certificates for `*.localhost` on first run. Traefik uses these for HTTPS.

- **Linux/macOS**: auto-installs via `brew`, `apt-get`, or `pacman`
- **Windows**: auto-installs via `winget`
- **If auto-install fails**: install mkcert manually, then re-run the startup script

Certificates are generated once in `Management/certs/` (gitignored) and reused on subsequent runs.

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

```bash
cd infra/Local
./selfhost-start.sh    # Linux/macOS
selfhost-start.bat     # Windows
```

The startup process:

1. Starts Management containers (Traefik)
2. Deploys Storage containers (SQL, CosmosDB, Azurite, Redis, **exp**)
3. Waits for databases to be ready
4. Creates SQL schema (`arolariu-sql` database)
5. Creates CosmosDB database (`primary`) with containers (`invoices`, `merchants`)
6. Creates Azurite blob containers (`invoices`) with public read access and CORS
7. Builds and launches the Backend API
8. Builds and launches the Frontend website

### Accessing Services

| Service | URL | HTTPS URL | Notes |
|---------|-----|-----------|-------|
| **Website** | http://localhost:3000 | https://website.localhost | Auth via Clerk |
| **API Health** | http://localhost:5000/health | https://api.localhost/health | Shows dependency status |
| **exp Health** | http://localhost:5002/api/health | — | Config service diagnostics |
| **exp Admin** | http://localhost:5002/admin | — | Config editor (local only) |
| **CosmosDB Explorer** | http://localhost:1234 | — | vNext emulator data explorer |
| **Azurite Blobs** | http://localhost:10000 | — | Blob storage (public read) |
| **SQL Server** | localhost:8082 | — | User: `sa`, Password in compose |
| **Redis** | localhost:6379 | — | No auth locally |
| **Traefik Dashboard** | http://localhost:8080 | https://traefik.localhost | Reverse proxy routes |

### How config flows locally

1. **exp** loads `config.docker.json` at startup (contains all config keys)
2. **API** fetches 11 config keys individually from `http://exp/api/v1/config`
3. **Website** fetches config keys on demand from `http://exp/api/v1/config`
4. **Feature flags** are fetched fresh on every page load (no cache)
5. Changes via the **admin UI** (`http://localhost:5002/admin`) take effect immediately

### Changing config at runtime

Open http://localhost:5002/admin to view and edit config values. Changes are
ephemeral (reset on container restart). Feature flag toggles take effect on
the next browser page load.

## Stopping the Environment

```bash
cd infra/Local
./selfhost-stop.sh    # Linux/macOS
selfhost-stop.bat     # Windows
```

## HTTPS via Traefik + mkcert

The local stack uses **Traefik v3** as a reverse proxy with `mkcert`-generated certificates for trusted HTTPS on `*.localhost` subdomains.

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

1. **mkcert** installs a local Certificate Authority into your OS/browser trust store
2. A wildcard cert for `*.localhost` is generated and mounted into Traefik
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

Windows hosts file entries (optional, requires admin):
```
127.0.0.1  traefik.localhost website.localhost api.localhost health.localhost
```

> Use:
> Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n# arolariu.ro local development (Traefik HTTPS)`n127.0.0.1  traefik.localhost website.localhost api.localhost health.localhost cosmosdb.localhost azurite-blob.localhost redis.localhost" -Encoding ASCII

### Regenerating certificates

Certs in `Management/certs/` don't expire for 2+ years. To regenerate:

```bash
cd infra/Local/Management/certs
mkcert -key-file local-key.pem -cert-file local-cert.pem "localhost" "*.localhost"
docker restart traefik
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port conflicts | Ensure ports 3000, 5000, 5002, 8081, 8082, 10000 are free |
| `exp` not starting | Check `config.docker.json` exists and is valid JSON |
| Clerk auth errors | Verify Clerk keys in `Frontend/.env` match your Clerk dashboard |
| Scan images not loading | Ensure Azurite has CORS enabled (done by `selfhost-start.sh`) |
| Invoice creation fails | Check CosmosDB containers exist with correct partition keys |
| API health unhealthy | Run `docker logs api-arolariu-ro` to see which dependency failed |
| Container build stale | Use `docker compose ... up -d --build --force-recreate` |

### Viewing logs

```bash
docker logs -f exp-arolariu-ro       # exp config service
docker logs -f api-arolariu-ro       # backend API
docker logs -f website-arolariu-ro   # frontend website
```

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) file for details.
