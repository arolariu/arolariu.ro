# arolariu.ro Local Development Environment

## Overview

Two coexisting modes for local development.

### Mode 1: Aspire (default — `npm run dev -- --engine <rancher|podman>`)

> [!NOTE] Ordinary Aspire startup preserves local data. First use initializes Alice, Bob, Charlie, and Dmitryi; an explicit, confirmed
> **Reset local data** dashboard action is available when you intentionally want to erase custom data and restore the scenario.

Recommended for normal development. The .NET Aspire AppHost (under `tooling/src/AppHost`) declares and orchestrates everything natively:

- **Infrastructure**: SQL Server, the Cosmos Linux vNext emulator, Azurite, and Redis are spawned through Aspire integrations
  (`AddSqlServer`, `AddAzureCosmosDB().RunAsEmulator()`, and related resources) on the selected Rancher Desktop or Podman Desktop engine.
- **Configuration overlay**: Aspire copies the developer-owned `sites/exp.arolariu.ro/config.docker.json` into ignored `config.aspire.json`,
  then overlays Aspire-specific endpoints and credentials. Selfhost and Aspire do not rely on identical injected values.
- **Native website HTTPS**: Aspire runs the website's `next dev --experimental-https` script. On a certificate-free first run, Next.js can
  download/run certificate tooling and install a local CA; confirm that trust-store change before starting. Next.js replaces
  `NODE_EXTRA_CA_CERTS` with the mkcert root in its server process, so the AppHost sets `NODE_USE_SYSTEM_CA=1`: the website's server then
  trusts the operating-system store, which already trusts the API's ASP.NET development certificate (`dotnet dev-certs https --trust`).
- **Website certificate renewal**: right before the website starts, the AppHost issues `sites/arolariu.ro/certificates/localhost.pem` and
  its key from the already-trusted local mkcert CA (`CAROOT`, by default `%LOCALAPPDATA%\mkcert` on Windows) when the certificate is missing
  or within 14 days of expiry. The new pair is written before the old one is replaced, and no trust store is touched (unlike
  `mkcert -install`, which also targets the Java store). If renewal is due but the CA is missing or untrusted, nothing changes and the
  website fails to start with the reason in its console log.
- **Apps as native processes**: exp (Python uvicorn via `AddUvicornApp`), API (.NET via `AddProject`), Website (Next.js via `AddNextJsApp`),
  CV/status (SvelteKit via `AddViteApp`), docs (Docusaurus via `AddJavaScriptApp`). Hot reload preserved.
- **Startup order**: containers → `local-bootstrap` (must exit 0) → exp → `local-identities` → api → website. cv, docs, and status start
  once `npm-install` finishes; every app has an HTTP health check, so green means it actually serves requests.
- **One npm install**: a single `npm-install` resource runs `npm install --no-audit --no-fund` at the repository root for the whole npm
  workspace; the apps do not run their own installers.
- **Cosmos emulator data**: a pinned emulator image and compatible named volume retain data across runs. Bootstrap records completed
  initialization instead of clearing data every time; see [persistent data and explicit reset](#persistent-data-and-explicit-reset).
- **Direct service URLs**: api → `https://localhost:5000`, website → `https://localhost:3000`, exp → `https://localhost:5002`, cv →
  `http://localhost:4173`, docs → `http://localhost:3100`, status → `http://localhost:3002`. Aspire's native certificate handling supplies
  HTTPS to exp and the API; use the resource URL shown by the current dashboard. Selfhost URLs below belong to its separate Compose setup.
- **Aspire dashboard**: live OTel traces / metrics / logs at `https://localhost:17080`.

In Aspire mode, the `infra/Local/{Storage,Backend,Frontend}/docker-compose.yml` files are NOT used — Aspire spawns its own containers
directly.

#### Four-persona development data

Bootstrap loads the fully expanded `alice.json`, `bob.json`, `charlie.json`, and `dmitryi.json` files from its `SeedData` directory as one
coordinated `v3` scenario. `SEED_DATA_DIRECTORY` may override that directory, including through the Aspire host's configuration;
`SEED_MANIFEST_PATH` and a single-file override are no longer supported. A missing, malformed, misowned, or mixed-version persona file
blocks initialization before scenario writes.

| Persona         | Active owned invoices | Merchants | Product lines per invoice | Nominal history | Geography                               |
| --------------- | --------------------: | --------: | ------------------------: | --------------- | --------------------------------------- |
| Bob, inactive   |                     5 |         4 |                      1-10 | 30 days         | One Romanian region                     |
| Charlie, rare   |                    20 |         7 |                      1-20 | 60 days         | Two Romanian regions                    |
| Alice, uncommon |                   300 |       100 |                      2-50 | 365 days        | Three regions across Romania and France |
| Dmitryi, loyal  |                 1,000 |       250 |                     1-100 | 1,095 days      | Romania, France, Germany, Italy, Spain  |

Dmitryi has 18,000 active product lines, with repeated SKUs representing repeat purchases rather than unique products. The complete scenario
has 1,325 active invoices, one additional soft-deleted Alice invoice, and 361 merchants. Sharing does not inflate ownership counts.
Histories use the original persisted UTC anchor rather than moving forward on every restart. Names, purchases, and addresses are fictional;
tax amounts are arithmetically reconciled development examples, not a historical tax-compliance corpus.

The `v3` dataset corrects Dmitryi's owner to the website's UUIDv5(DNS, email) contract, bounds day-zero checkout times at midnight for
deterministic retries, and supplies three readable synthetic PNG receipt previews linked to their actual invoice baskets and totals.
Classification overrides must match the complete canonical hierarchy and official labels, not just an existing leaf.

Existing `v1` and `v2` initialization receipts are deliberately not upgraded automatically. Export data you need, then use the existing
confirmed **Reset local data** action if you intend to erase the owned local Cosmos, storage, and SQL user data and adopt `v3`. Otherwise
preserve the old store and use the matching code/fixture version. Normal startup never merges or overwrites it.

#### Persistent data and explicit reset

All four Aspire infrastructure images are pinned by immutable digest and paired with explicit versioned volume names:

| Service    | Image release                | SHA-256 digest                                                     | Data volume                       |
| ---------- | ---------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| Cosmos     | `EN20261008`                 | `4535ddbd27bba762f3e068f7585feb0022a2559ceccc9394b23aa38d91d77c38` | `arolariu-cosmos-data-en20261008` |
| SQL Server | 2022 CU27+GDR, `16.0.4305.5` | `cf8f0ab2ebe61feec2eed2629061a07d247f791c2a8ddda74a4ac9f06a291718` | `arolariu-mssql-data-16.0.4305.5` |
| Azurite    | `3.35.0`                     | `647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37` | `arolariu-azurite-data-3.35.0`    |
| Redis      | `8.6.3`                      | `4d25e2fe601f7ffaeb4437cb6ced3518bc36edf34ebe98863c80836943d94529` | `arolariu-redis-data-8.6.3`       |

The corresponding C# constants include the release in their identifiers: `CosmosDataVolumeEn20261008`, `SqlDataVolumeV16_0_4305_5`,
`AzuriteDataVolumeV3_35_0`, and `RedisDataVolumeV8_6_3`. Cosmos, Azurite, and Redis retain their previously validated image releases. SQL
uses the explicitly selected [CU27 security update](https://support.microsoft.com/en-us/help/5126934): the older cached SQL manifest was no
longer published by MCR and would fail a clean pull.

The new SQL, Azurite, and Redis volume names deliberately select fresh stores on the next Aspire start. The old `arolariu-mssql-data`,
`arolariu-azurite-data`, `arolariu-redis-data`, and archived `arolariu-cosmos-data` volumes remain untouched; nothing is renamed, copied, or
deleted automatically. Selfhost's separate volumes and images are unchanged. Reverting the declarations selects the old names again but does
not migrate data written to the newer volumes.

Cosmos's physical volume name is unchanged. If it already contains a completed initialization receipt while the new Azurite volume is empty,
ordinary startup will not recreate seed scans or copy custom blobs from the old storage volume. Plan preservation/copying separately, or use
the confirmed **Reset local data** command only if clearing the current Cosmos/SQL/storage user data and restoring the complete scenario is
intentional. No automatic reset or migration resolves this mixed-store state.

The older initialized emulator state was readable with the May image but failed with the October image's queries and feeds
(`500 unknown type of jsonb container`). Fresh October storage works and persists across container recreation. Rebuilding only the logical
Cosmos database did not repair that engine-state incompatibility. An image upgrade therefore requires a deliberate compatibility and
data-preservation decision; do not silently reuse an incompatible volume, rotate to empty storage, or delete an old volume.

On first use, Bootstrap stores an initialization receipt in `primary/local-development`, partitioned by `/id`. Its `invoice-scenario` record
keeps the manifest version, original UTC anchor date, and completion state. Missing seed items/scans are created without overwriting
existing data, and queues are not cleared. Interrupted initialization resumes with the same date; completed initialization leaves edited or
deleted seed records alone. A changed fixture version requires an explicit preservation/reset decision instead of automatic reseeding.

To intentionally start again, open the Aspire dashboard's **local-bootstrap** resource actions and choose **Reset local data**. Read and
accept the confirmation only after exporting anything you need and stopping external clients that write directly to these services. The
command is local Development/run-mode only; headless invocations without interactive confirmation fail closed.

| Owned service | Data removed                                                         | Preserved or restored                                                                           |
| ------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `cosmos`      | Every user database, container, document, and initialization receipt | Restore `primary`, invoice/merchant partition contracts, and the four-persona seed.             |
| `storage`     | Every blob container/blob, queue/message, and table/entity           | Keep service configuration/CORS; restore invoice scans/container and the empty analysis queue.  |
| `mssql`       | Every non-system user database, schema, and row                      | Keep `master`, `model`, `msdb`, `tempdb`, server configuration/logins; recreate `arolariu-sql`. |

Before stopping writers or deleting anything, reset requires the captured native containers to be running with their own allocated
endpoints. It rechecks their physical container identities before each store/initialization/resumption phase; unavailable or replaced
instances cannot authorize deletion through retained loopback ports. Shutdown attempts every writer even if another stop fails.

The API, website, and any active/pending initializer are quiesced before deletion. Prerequisites are provisioned explicitly, then a new
Bootstrap execution must finish successfully before the API and website restart and pass fresh health checks. Independent sites, Redis,
selfhost resources, and the legacy Cosmos volume are not cleared. Named volumes and database-engine files are not reformatted or deleted.

The five-minute operation budget starts only after confirmation succeeds; reading the dialog does not consume destructive-work time. After
reseeding, unavailable exp and local Identity executions are recovered before the API resumes, while healthy dependency executions are
preserved. Failures report the phase, affected resource, and safe provider type/status/error codes without exposing raw provider messages or
credentials; a cleanup failure retains the original failure details separately.

Reset is serialized, bounded, and not transactional across stores. Cancellation or failure can leave data partially cleared; writers are not
automatically resumed against that state. Inspect the failed phase and explicitly retry after fixing the cause. If writer shutdown could not
be confirmed, stop the AppHost before continuing. Reset is not a repair for arbitrary raw-volume/image incompatibilities.

#### Tooling structure and extension points

`tooling\src\AppHost\Program.cs` is the composition root. Capability slices keep resource definitions beside their supporting behavior:
`Infrastructure\Sql` owns connection settings/readiness, `Infrastructure\Storage` owns Azurite provisioning, and `Applications\Exp` owns the
exp resource/configuration overlay. `LocalDevelopment` wires the bootstrap and persona helpers. `RepositoryLayout` anchors project/config
paths to the AppHost directory, independent of shell cwd.

Extend an existing slice or add a focused native builder extension for a new capability, then wire its references/waits explicitly and add
graph tests. Use Aspire's resource builders and typed handle bundles, not a parallel registry or generic repository framework. Shared
[`tooling\Directory.Build.props`](../../tooling/Directory.Build.props) owns the compiler, analyzer, style, and documentation policy for all
tooling projects. Production uses recommended analysis and XML documentation; `.Tests` projects select the fixed framework-default analysis
without XML documentation by project name during early MSBuild evaluation. SDK declarations and resource-specific settings remain in each
project. See the [tooling build and package policy](../../tooling/README.md#build-and-package-policy) for the ownership boundaries.

Bootstrap keeps invoice-scenario materialization and storage adapters together; Identity keeps persona lookup/token creation together.
Source projects live under `tooling\src`; root launch commands are unchanged. Each executable has an owning MSTest project:

```powershell
dotnet test tooling\tests\AppHost.Tests\AppHost.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Bootstrap.Tests\LocalDevelopment.Bootstrap.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Identity.Tests\LocalDevelopment.Identity.Tests.csproj
```

The exp overlay is written through an atomic replacement: generation failures leave the previous target intact and never overwrite the
developer-owned source. Filesystem-linked source/target aliases are rejected. Temporary configuration files start with owner-only access;
replacement preserves the existing Windows target ACL or Unix target mode. New Unix targets use mode `0600`. Bootstrap forwards
graceful-shutdown cancellation and checks it between initialization phases. Completed writes are not rolled back; the receipt allows
create-only recovery on the next start. Forced process termination cannot guarantee cooperative cleanup. The explicit-reset and
certificate-trust checkpoints above still apply.

Azurite's initial readiness event performs idempotent CORS/container/queue provisioning. If provisioning fails, native health polling
retries only that failed work, with six attempts and the existing backoff per operation per poll. Storage remains unhealthy while recovery
is pending or failing; a successful registration is not provisioned again. Recovery does not rerun scenario deletion or seed operations.

Unix process-level coverage sends SIGTERM to the real Bootstrap executable while a synthetic loopback storage response is pending. It
verifies cooperative exit code `1`, a cancellation diagnostic, and no subsequent queue operation; an unhandled control process verifies
native signal termination separately.

### Mode 2: Selfhost (advanced — `npm run dev:selfhost -- --engine <rancher|podman>`)

Everything containerized via the selected Rancher Desktop or Podman Desktop Compose provider, including apps. Used for:

- Auditing container behavior
- CI parity validation
- Testing deploy-mock-of-prod configurations

The Selfhost flow is the rest of this README. It starts the Management + Storage + Backend + Frontend Compose stacks (with
`--profile selfhost` to include containerized exp + apps). Docker Desktop is deprecated and is not a supported local runtime for this
repository.

---

## Selfhost mode — full setup

This repository contains a complete containerized development environment for the arolariu.ro project. The setup uses an engine-aware
Compose wrapper to orchestrate multiple containers organized in logical groups (Management, Storage, Backend, Frontend), allowing developers
to run the entire stack locally with Rancher Desktop or Podman Desktop.

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
Frontend (localhost:3000)  →  exp (http://exp:8080)  ←  Backend (localhost:5000)
     ↓                            ↓                        ↓
   Clerk Auth               config.docker.json         CosmosDB / SQL / Azurite
```

The API and website fetch their indexed runtime configuration from the exp service. Each consumer applies its own typed cache/refresh
behavior; application containers do not embed the environment-specific values in source.

## Prerequisites

- **Rancher Desktop** in Moby/dockerd mode, or **Podman Desktop** with `podman compose`
- Docker Desktop is deprecated and is not a supported local runtime for this repository
- **Node.js** 24.15.0+ on the 24.x line, or ≥ 26, and **npm** ≥ 11 (for Azurite blob container init)
- **Git** (to clone the repository)
- `MSSQL_SA_PASSWORD` environment variable for the local SQL Server container. Keep it in your shell/session environment only; do not commit
  it to `.env` files, launch profiles, or source control.
- 4GB+ RAM available for containers
- 10GB+ of free disk space
- _(Optional)_ **mkcert** installed separately for browser-trusted selfhost HTTPS. Without it, startup continues with Traefik's default
  self-signed certificate.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install
```

### 2. Decide whether to use trusted local HTTPS certificates

The startup script never installs the `mkcert` executable. If `mkcert` is already available and the selfhost certificates are missing,
startup runs `mkcert -install` and generates a `*.localhost` certificate for Traefik. That command changes the local trust store, so
acknowledge that security-sensitive effect before the first run.

- **With mkcert installed and approved**: the local CA and certificates are created, then reused from `Management/certs/`.
- **Without mkcert**: startup continues and Traefik uses its default self-signed certificate.
- **To install mkcert**: follow its upstream installation guide separately; dependency installation is not part of repository startup.

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

The frontend image build also reads `sites/arolariu.ro/.env` as the `website_env` build secret. Create it with `npm run setup`.

These files are gitignored — they will never be committed. `npm run dev:selfhost` checks that `config.docker.json` and
`sites/arolariu.ro/.env` exist as files before starting any stack. Otherwise Docker Compose and podman-compose would create the missing exp
bind source as a directory, and the frontend build would fail only after the other stacks had started.

Exp configuration is mounted read-only, never baked into its image. Local admin updates change only the in-memory snapshot, as before; edit
the developer-owned source outside the container for persistent changes and allow the normal refresh. Exp listens on unprivileged port 8080
internally (host port 5002 is unchanged). Its image probe is liveness; the selfhost Compose probe uses `/api/ready`, which checks
configuration readability, not upstream storage or identity-service availability.

Selfhost SQL and Cosmos now store data in the named volumes `arolariu-selfhost-mssql-data` and `arolariu-selfhost-cosmos-data`. These are
separate from Aspire's existing volumes; adding these mounts does not migrate old container-layer data or repair an existing database.
Preserve old containers and obtain a separate migration approval if their data must be moved. Ordinary Compose `down` preserves these named
volumes; never add volume deletion or pruning implicitly. SQL health and bootstrap use `mssql-tools18`, retain the local
self-signed-certificate policy and take passwords only from environment.

The selfhost wrapper refuses start and stop reconciliation if existing `mssql` or `cosmosdb` containers are not attached to these exact data
volumes. It leaves those containers intact; preservation or migration requires separate approval.

### 4. Start the environment

Aspire and selfhost have different data effects. Aspire initializes its scenario once and exposes an explicit dashboard reset; selfhost
performs provisioning without either operation.

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
3. Waits a fixed ten seconds before invoking storage/bootstrap steps; this is not a Compose health-readiness gate
4. Performs the current SQL/Cosmos/Azurite provisioning
5. Starts the Backend and Frontend Compose projects detached

The root wrapper then exits while Compose keeps running. Use Compose `ps`, health status, and logs to establish readiness; container
existence alone is not sufficient.

### Accessing Services

| Service               | URL                              | HTTPS URL                    | Notes                                                                            |
| --------------------- | -------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| **Website**           | http://localhost:3000            | https://website.localhost    | Auth via Clerk                                                                   |
| **API Health**        | http://localhost:5000/health     | https://api.localhost/health | Shows dependency status                                                          |
| **exp Health**        | http://localhost:5002/api/health | —                            | Config service diagnostics                                                       |
| **exp Admin**         | http://localhost:5002/admin      | —                            | Config editor (local only)                                                       |
| **CosmosDB Explorer** | http://localhost:1234            | —                            | vNext emulator data explorer                                                     |
| **Azurite Blobs**     | http://localhost:10000           | —                            | Blob storage (public read)                                                       |
| **SQL Server**        | localhost:8082                   | —                            | User: `sa`; password comes from shell variable `MSSQL_SA_PASSWORD`               |
| **Redis**             | localhost:6379                   | —                            | Local password authentication is enabled; use the injected runtime configuration |
| **Traefik Dashboard** | http://localhost:8080            | https://traefik.localhost    | Reverse proxy routes                                                             |

### How config flows locally

1. **exp** loads `config.docker.json` at startup (contains all config keys)
2. **API** fetches its indexed configuration values from `http://exp:8080/api/v1/config` through `EXP_PROXY_URL`
3. **Website** fetches config keys on demand from `http://exp:8080/api/v1/config` through `EXP_PROXY_URL`
4. **Ordinary website config values** use the server-declared refresh interval in the process-local cache, with stale fallback while its
   circuit breaker is open
5. **Feature flags** invalidate their config cache before each read and fall back to their defined defaults when exp is unavailable
6. Changes via the **admin UI** become visible after the affected consumer refreshes or invalidates its cache

### Changing config at runtime

Open http://localhost:5002/admin to view and edit config values. Changes are ephemeral (reset on container restart). Consumers may retain a
value until its current refresh interval expires; feature-flag reads refresh on each request.

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

Rancher Desktop runs Aspire through its Moby/Docker-compatible backend, so the effective Aspire runtime value is `docker`. Rancher Desktop
is selected through its Moby/Docker-compatible backend; Aspire/DCP sees this as `docker`, not as a separate `rancher-desktop` runtime.
Ensure your editor process can find the selected runtime on PATH before using VS Code F5 profiles; the repository launch profiles do not
hardcode OS-specific install paths.

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

If `podman compose version` reports a provider under `C:\Program Files\Docker\...`, install `podman-compose` and point Podman at it:

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

The stop wrapper runs Compose `down` for every project without `--volumes`. Storage keeps `--profile selfhost`, matching start, so the
profile-gated `exp` container is removed and the shared `arolariu-network` can be deleted. Named SQL Server, Cosmos, Azurite and Redis
volumes survive ordinary teardown. The wrapper refuses to reconcile legacy SQL/Cosmos containers without their intended volumes; do not
bypass that guard with direct Compose removal.

## HTTPS via Traefik + mkcert

The local stack uses Traefik as a reverse proxy. When approved and available, `mkcert` supplies browser-trusted certificates for
`*.localhost`; otherwise Traefik falls back to its default self-signed certificate.

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

1. On the approved first trusted-certificate run, `mkcert -install` installs a local Certificate Authority into the OS/browser trust store
2. A wildcard certificate for `*.localhost` is generated and mounted into Traefik
3. Traefik's **file provider** loads the cert via `traefik/dynamic/tls.yml`
4. All services use `tls=true` labels — Traefik presents the mkcert cert
5. HTTP→HTTPS redirect is enabled on the `:80` entrypoint

### Available HTTPS routes

| Route                            | Service                |
| -------------------------------- | ---------------------- |
| `https://website.localhost`      | Next.js website        |
| `https://api.localhost`          | .NET API               |
| `https://traefik.localhost`      | Traefik dashboard      |
| `https://health.localhost`       | Healthchecks dashboard |
| `https://mssql.localhost`        | SQL Server             |
| `https://cosmosdb.localhost`     | CosmosDB emulator      |
| `https://azurite-blob.localhost` | Azurite blob storage   |

### Why not Let's Encrypt ACME?

ACME requires a publicly resolvable domain — `*.localhost` never resolves externally. The `mkcert` approach gives browser-trusted certs
without needing a real domain, DNS, or public internet access.

### OS compatibility

| OS                | `*.localhost` DNS                    | HTTPS routes                                                                                |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| **macOS / Linux** | ✅ Resolves automatically (RFC 6761) | Work out of the box                                                                         |
| **Windows**       | ❌ Does not resolve subdomains       | Use direct `localhost:PORT` URLs, or add entries to `C:\Windows\System32\drivers\etc\hosts` |

Windows hosts file entries are optional and require administrator approval:

```
127.0.0.1  traefik.localhost website.localhost api.localhost health.localhost
```

> Use: Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n# arolariu.ro local development (Traefik HTTPS)`n127.0.0.1
> traefik.localhost website.localhost api.localhost health.localhost cosmosdb.localhost azurite-blob.localhost redis.localhost" -Encoding
> ASCII

### Regenerating certificates

Confirm the trust-store and certificate-file changes before regenerating:

```bash
cd infra/Local/Management/certs
mkcert -key-file local-key.pem -cert-file local-cert.pem "localhost" "*.localhost"
npm run dev:selfhost:stop -- --engine rancher
npm run dev:selfhost -- --engine rancher
```

## Troubleshooting

| Issue                   | Solution                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Port conflicts          | Ensure ports 3000, 5000, 5002, 8081, 8082, 10000 are free                                                                             |
| `exp` not starting      | Check `config.docker.json` exists and is valid JSON                                                                                   |
| Clerk auth errors       | Verify Clerk keys in `Frontend/.env` match your Clerk dashboard                                                                       |
| Scan images not loading | Ensure the current selfhost bootstrap configured Azurite CORS and the required container                                              |
| Invoice creation fails  | Check CosmosDB containers exist with correct partition keys                                                                           |
| API health unhealthy    | Use the root application logs first, then inspect the owning Storage or Management Compose project for the first unhealthy dependency |
| Container build stale   | Use `npm run containers:compose -- --engine rancher --file infra/Local/Backend/docker-compose.yml -- up -d --build --force-recreate`  |

### Viewing logs

```bash
npm run dev:selfhost:logs -- --engine rancher
npm run dev:selfhost:logs -- --engine podman
```

The root logs action tails only the selfhost application containers (`exp`, API, and website). For SQL, Cosmos, Azurite, Redis, or Traefik,
run the `containers:compose` wrapper with the owning Compose file and an exact `ps`/`logs` operation.

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) file for details.
