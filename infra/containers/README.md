# Container Images for arolariu.ro

This directory contains the Dockerfiles that build from the repository root. `npm run containers:build` and `containers:run` use all four;
the `infra/Local` selfhost stacks use the frontend, backend, and exp files; and CI builds the website image from `Dockerfile.frontend`. CI
builds the API and exp images from `sites/api.arolariu.ro/Dockerfile` and `sites/exp.arolariu.ro/Dockerfile` instead. CV deploys to Azure
Static Web Apps, and the status and docs sites have no Dockerfile.

## Features

All Dockerfiles include:

- ✅ **Multi-stage builds** for optimized image size
- ✅ **Non-root users** for security
- ✅ **Health checks** for container orchestration
- ✅ **OCI-compliant labels** for container metadata
- ✅ **Proper signal handling** (dumb-init in the frontend, CV, and exp images; the backend runs `dotnet` directly as PID 1)
- ✅ **Layer caching optimization** for faster builds
- ✅ **Security hardening** with minimal attack surface
- ✅ **Alpine-based images** where possible

## Available Files

| File                  | Site            | Technology            | Port | Base Image                |
| --------------------- | --------------- | --------------------- | ---- | ------------------------- |
| `Dockerfile.frontend` | arolariu.ro     | Next.js 16 + React 19 | 3000 | node:24-alpine            |
| `Dockerfile.backend`  | api.arolariu.ro | .NET 10 ASP.NET Core  | 8080 | dotnet/aspnet:10.0-alpine |
| `Dockerfile.cv`       | cv.arolariu.ro  | SvelteKit + serve     | 3000 | node:24-alpine            |
| `Dockerfile.exp`      | exp.arolariu.ro | FastAPI + Uvicorn     | 8080 | python:3.12-slim          |

## Build Context

**Important:** All Dockerfiles are designed to be built from the **repository root**, not from the `infra/containers` directory or
individual site directories.

```bash
# Correct: from repository root
npm run containers:build -- --engine rancher --target frontend

# Wrong: a direct engine build that uses infra/containers as its context
cd infra/containers && docker build -f Dockerfile.frontend .  # ❌ context lacks package.json and sites/
```

## Local engine-aware builds

Docker Desktop is deprecated for this repository. Use Rancher Desktop or Podman Desktop:

```powershell
npm run containers:build -- --engine rancher --target frontend
npm run containers:build -- --engine podman --target backend
npm run containers:run -- --engine rancher --target frontend
npm run containers:run -- --engine podman --target backend
```

The helper builds from the repository root and routes build/run commands through the selected runtime adapter.

Podman image and Compose build commands select Docker image format explicitly so `HEALTHCHECK` survives serialization. Direct Podman builds
must also use `--format docker`.

Build contexts exclude environment files, private exp configuration, package-feed configuration, key material and nested build/dependency
artifacts. The website recipe installs the published `@arolariu/components` tarball pinned in `sites/arolariu.ro/package.json` (it copies
only the `packages/components` workspace manifest), so local component-library changes are not included; it preserves the complete Next.js
standalone hierarchy. Only public website metadata values are build arguments. Provider-independent `NEXT_PUBLIC_*` values are selected from
the build-only `website_env` secret; private values are not passed to the compiler. The image helper and Compose select the generated
website `.env` as this secret, without embedding the file in an image or introducing provider-specific defaults.

Frontend `containers:run` requires the generated website `.env`, parses its quoted values and supplies them through the child process
environment with engine variable-name flags, never secret values in arguments. Exp `containers:run` requires
`sites/exp.arolariu.ro/config.docker.json` and mounts it read-only through `EXP_LOCAL_CONFIG_PATH`. Neither file is copied into an image.
Supply runtime configuration privately through the established environment contract. Authentication configuration and migration are owned by
their separate workstream; this container follow-up does not provision provider-specific cloud settings.

Use the package feeds configured for your environment. The image helper accepts `AROLARIU_CONTAINER_NPM_CONFIG`,
`AROLARIU_CONTAINER_PIP_CONFIG` and `AROLARIU_CONTAINER_NUGET_CONFIG` as paths to private feed-policy files. The corresponding build secret
IDs are `npm_config`, `pip_config` and `nuget_config`, mounted only during dependency installation. Direct builds can pass
`--secret id=<id>,src=<file>`. Do not copy these files into the context. A Windows remote Podman build may reject secret-mount temporary
paths; run the same build natively inside the existing Podman guest rather than changing engine, disabling TLS or using a fallback registry.

The repository `.npmrc` is excluded from build contexts too, so the recipes pass `--engine-strict` to `npm ci` directly. A build on a cached
Node base below `engines.node` (`^24.15.0 || >=26.0.0`) fails with `EBADENGINE` until the base is refreshed, for example with `--pull`.

## Build Commands

### Frontend (arolariu.ro)

```bash
npm run containers:build -- --engine rancher --target frontend
npm run containers:run -- --engine rancher --target frontend
```

### Backend (api.arolariu.ro)

```bash
npm run containers:build -- --engine podman --target backend
npm run containers:run -- --engine podman --target backend

# CI owns tests; image recipes only restore/build/publish.
# Build the optional security-scanning input stage:
podman build --format docker -f infra/containers/Dockerfile.backend --target=security-scan -t arolariu-backend-scan .
```

### CV Site (cv.arolariu.ro)

```bash
npm run containers:build -- --engine rancher --target cv
npm run containers:run -- --engine rancher --target cv
```

### Experimentation Service (exp.arolariu.ro)

```bash
npm run containers:build -- --engine rancher --target exp
npm run containers:run -- --engine rancher --target exp
```

## Build Arguments

### Common Build Arguments

The frontend, backend, and CV Dockerfiles declare these arguments; `Dockerfile.exp` declares no build arguments.

| Argument     | Description                     | Default   |
| ------------ | ------------------------------- | --------- |
| `COMMIT_SHA` | Git commit SHA for traceability | `unknown` |
| `BUILD_DATE` | ISO 8601 build timestamp        | -         |
| `VERSION`    | Semantic version                | `1.0.0`   |

### Frontend-Specific

| Argument                            | Description                                                                  | Default   |
| ----------------------------------- | ---------------------------------------------------------------------------- | --------- |
| `NODE_VERSION`                      | Node.js major version                                                        | `24`      |
| `AZURE_TENANT_ID`                   | Azure AD tenant ID                                                           | -         |
| `AZURE_SUBSCRIPTION_ID`             | Azure subscription ID                                                        | -         |
| `AZURE_CLIENT_ID`                   | Azure managed identity client ID                                             | -         |
| `INFRA`                             | Infrastructure type                                                          | `unknown` |
| `SITE_ENV`                          | `PRODUCTION` or `DEVELOPMENT`; baked into the bundle and required at startup | -         |
| `SITE_URL`                          | Public site URL; baked into the bundle                                       | -         |
| `SITE_NAME`                         | Public site host name; baked into the bundle                                 | -         |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk key inlined into the client bundle                              | -         |
| `TIMESTAMP`                         | Build timestamp                                                              | -         |

### Backend-Specific

| Argument                | Description                      | Default                   |
| ----------------------- | -------------------------------- | ------------------------- |
| `DOTNET_VERSION`        | .NET SDK/runtime version         | `10.0`                    |
| `BUILD_CONFIGURATION`   | Build configuration              | `Release`                 |
| `API_NAME`              | API service name                 | `arolariu-backend-api`    |
| `API_URL`               | API base URL                     | `https://api.arolariu.ro` |
| `AZURE_TENANT_ID`       | Azure AD tenant ID               | -                         |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID            | -                         |
| `AZURE_CLIENT_ID`       | Azure managed identity client ID | -                         |
| `INFRA`                 | Infrastructure type              | `unknown`                 |

## Environment Variables (Runtime)

### Frontend

Public configuration is supplied by CI as Docker build arguments. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as a GitHub environment
secret in each deployment environment. `SITE_*`, `COMMIT_SHA`, and `TIMESTAMP` remain build-time inputs. Cloud builds do not generate or
mount a website `.env`.

#### Configuring the public Clerk key in GitHub

In **Settings > Environments**, open `development` and add an environment secret named `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` containing that
Clerk instance's `pk_test_...` value. In `production`, add the same secret name with the `pk_live_...` value.

The workflow declares the input once in its global `env` block. Both jobs select their deployment environment with
`inputs.environment || 'development'`, so the same-named input resolves to the matching environment's value. Preview pushes and development
dispatches use `DEVELOPMENT`; production dispatches use `PRODUCTION`. Separate conditional key names are not necessary. Keep each public key
paired with the Clerk secret stored under the corresponding exp label.

If you prefer plain configuration variables for these public values, create **repository-level** variables named
`CLERK_PUBLISHABLE_KEY_DEVELOPMENT` and `CLERK_PUBLISHABLE_KEY_PRODUCTION` under **Settings > Secrets and variables > Actions > Variables**,
and replace the global expression with:

```yaml
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
  ${{ vars[inputs.environment == 'production' && 'CLERK_PUBLISHABLE_KEY_PRODUCTION' || 'CLERK_PUBLISHABLE_KEY_DEVELOPMENT'] }}
```

Do not substitute an environment-level `vars` value into the global expression:
[environment variables become available only after the job starts](https://docs.github.com/en/actions/reference/workflows-and-actions/variables#configuration-variable-precedence).
The configured environment secrets remain the workflow's supported default. The variable expression selects a name before reading its value,
so a missing production key does not silently select the development key.

The existing Next.js `instrumentation.register()` hook awaits `initializeRuntimeEnvironmentConfiguration()` before requests are served. That
method fetches the complete exp runtime document using the PRODUCTION or DEVELOPMENT label selected by `SITE_ENV`; missing or unsupported
environments are rejected. Server-side reads use the initialized document, and runtime configuration is applied to the Node process without
logging values.

Local, Aspire, and selfhost modes use local exp when available and retain dotenv values when it is unreachable. Invalid documents and cloud
failures stop initialization instead of silently substituting defaults. `.env` is retained for local/offline use and deprecated for cloud
deployment. Set `INFRA=local` when using a local Azure identity to access other resources; both startup and subsequent config reads then
retain local exp routing.

The container keeps the standard `node server.js` entrypoint. Private values are not baked into image layers. Restarting the Node server
reloads changed private configuration from exp.

Cloud bootstrap gives token acquisition its own 30-second abort signal. Each exp HTTP attempt has a fresh 30-second deadline starting only
after request credentials are available; managed-identity cold-start latency does not consume the exp request budget. If that HTTP deadline
expires, bootstrap retries up to twice with a one-second pause between attempts (at most 92 seconds for HTTP attempts and pauses).
Authentication failures, HTTP error responses, and invalid documents are not retried. Ordinary per-key reads retain their 10-second cloud
deadline; local bootstrap retains its single two-second attempt and dotenv fallback.

Retries happen inside initialization because Next.js caches the instrumentation registration promise, including a rejected promise. An
exhausted bootstrap remains a startup failure; restarting/replacing that Node worker is required to attempt initialization again. Cloud
failures identify `stage=authentication` or `stage=http`, elapsed time, known SDK/network error identifiers, and whether a managed-identity
endpoint was configured. Provider messages, tokens, endpoint values, and private configuration are never included in these errors.

The build workflow runs a bounded startup smoke test on the final image before publishing it. It uses the image's normal entrypoint and
runner-stage environment (without setting `SITE_ENV` or private variables), plus a local exp fixture. The test checks the requested exp
label and the application's health report, proving the build-time environment survives into runtime instrumentation. Run it on a Linux
Docker host after building an image:

```bash
node sites/arolariu.ro/tests/container/runtime-configuration.smoke.mjs <image> PRODUCTION
```

The smoke also exercises the real bundled Azure SDK against a loopback App Service-shaped managed-identity endpoint, checking the selected
client ID, token audience and Authorization handoff. A delayed valid token response covers managed-identity cold-start latency. Only the
external identity and exp services are controlled; the normal server entrypoint remains unchanged. The fixtures and test containers are
temporary; no real Azure credentials are used.

| Variable                              | Description                                               | Required |
| ------------------------------------- | --------------------------------------------------------- | -------- |
| `SITE_ENV`                            | Public build input: PRODUCTION or DEVELOPMENT             | Yes      |
| `SITE_URL` / `SITE_NAME`              | Public site metadata from CI                              | Build    |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Public Clerk key from GitHub configuration                | Build    |
| `CLERK_SECRET_KEY`                    | Runtime Clerk secret from exp, or local dotenv            | Runtime  |
| `API_JWT`                             | Runtime JWT signing secret from exp, or local dotenv      | Runtime  |
| `API_JWT_ISSUER` / `API_JWT_AUDIENCE` | Runtime JWT metadata from exp, or local dotenv            | Runtime  |
| `API_URL` / `STORAGE_BLOB_ENDPOINT`   | Runtime service endpoints from exp, or local dotenv       | Runtime  |
| `RESEND_API_KEY`                      | Runtime email key; empty string disables email            | Optional |
| `EXP_PROXY_URL`                       | Optional exp URL override, including bare-metal local exp | No       |

### Backend

Backend configuration is resolved at runtime from `appsettings.json`, `appsettings.{ASPNETCORE_ENVIRONMENT}.json`, environment variables,
and the exp service. The backend build arguments only set overridable `ENV` defaults.

| Variable                 | Description                                                                                                         | Required |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------- |
| `INFRA`                  | `azure`, `proxy`, or `local`; the image default `unknown` stops startup                                             | Yes      |
| `EXP_PROXY_URL`          | exp URL override                                                                                                    | No       |
| `AZURE_CLIENT_ID`        | Unless `EXP_PROXY_URL` is set: present selects `https://exp.arolariu.ro` with Entra ID, absent selects `http://exp` | No       |
| `ASPNETCORE_ENVIRONMENT` | Selects `appsettings.{env}.json`; defaults to `Development`                                                         | No       |

### CV Site

| Variable | Description | Default   |
| -------- | ----------- | --------- |
| `PORT`   | Server port | `3000`    |
| `HOST`   | Server host | `0.0.0.0` |

`serve` always listens on port 3000 (`-l 3000`); `PORT` and `HOST` are informational, and overriding them has no effect.

## Multi-Architecture Builds

For building multi-architecture images (amd64/arm64):

Use the engine-native multi-architecture build workflow for the selected runtime. For local development, prefer the
`npm run containers:build -- --engine <rancher|podman>` wrapper; publishing multi-architecture images remains a release pipeline concern.

## Health Checks

Each Dockerfile declares a `HEALTHCHECK`, which Docker-compatible engines and Docker Compose run (Podman keeps it only with the Docker image
format described above). Kubernetes and Azure Container Apps do not read it; configure their own probes against these endpoints.

| Container | Endpoint                       | Interval | Timeout | Start Period |
| --------- | ------------------------------ | -------- | ------- | ------------ |
| Backend   | `GET /health` (port 8080)      | 30s      | 10s     | 30s          |
| Frontend  | `GET /api/health/` (port 3000) | 30s      | 10s     | 30s          |
| CV        | `GET /` (port 3000)            | 30s      | 10s     | 10s          |
| Exp       | `GET /api/health` (port 8080)  | 30s      | 5s      | 10s          |

## Security

### Non-Root Users

| Container | User        | UID  | Group      | GID  |
| --------- | ----------- | ---- | ---------- | ---- |
| Frontend  | `nextjs`    | 1001 | `nodejs`   | 1001 |
| Backend   | `appuser`   | 1001 | `appgroup` | 1001 |
| CV        | `sveltekit` | 1001 | `nodejs`   | 1001 |
| Exp       | `app`       | 1001 | `app`      | 1001 |

### Image Hardening

- Alpine-based frontend, backend, and CV images; exp uses `python:3.12-slim`
- Non-root runtime users (UID/GID 1001); the backend user has no login shell
- Multi-stage builds keep SDKs and build tools out of runtime images

The images do not themselves enforce a read-only root filesystem, dropped capabilities, or SUID/SGID removal, and every runtime image
includes `/bin/sh`, which the shell-form health checks use.

### Vulnerability Scanning

```bash
# Scan with Trivy
trivy image arolariu-frontend:latest
trivy image arolariu-backend:latest
trivy image arolariu-cv:latest

# Scan with Grype
grype arolariu-frontend:latest
grype arolariu-backend:latest

# Build security scan stage (backend only)
podman build --format docker -f infra/containers/Dockerfile.backend --target=security-scan -t scan .
```

## Compose Stacks

The maintained multi-container definitions are the selfhost Compose files under `infra/Local`: `Storage` (including the profile-gated exp
service), `Backend`, and `Frontend`. Start them with `npm run dev:selfhost -- --engine <rancher|podman>`; see the
[local environment guide](../Local/readme.md).

A hand-written Compose file must supply what those files do:

- Frontend build arguments `SITE_ENV` (`PRODUCTION` or `DEVELOPMENT`), `SITE_URL`, and `SITE_NAME`, plus the `website_env` build secret.
  These values are baked into the bundle, so a runtime-only `SITE_ENV` cannot replace them.
- `INFRA=local` and `EXP_PROXY_URL=http://exp:8080` on both applications. The backend image default `INFRA=unknown` stops API startup, and
  without the override both applications target `http://exp` on port 80 while exp listens on 8080.
- An exp service built from `Dockerfile.exp` with `sites/exp.arolariu.ro/config.docker.json` mounted read-only.
- A frontend probe on `/api/health/`: with `trailingSlash: true`, `/api/health` answers with a 308 redirect, which `curl -f` treats as
  success.

## Troubleshooting

### Build Fails with "file not found"

Ensure you're building from the repository root, not from a subdirectory.

### Health Check Fails

1. Check container logs: `containers:run` streams them in the foreground; for the selfhost exp, API, and website containers, use
   `npm run dev:selfhost:logs -- --engine rancher` or `npm run dev:selfhost:logs -- --engine podman`
2. Verify the application started correctly
3. Probe the image's endpoint manually: backend `curl http://localhost:5000/health`, frontend `curl http://localhost:3000/api/health/`, exp
   `curl http://localhost:5002/api/health`, or CV `curl http://localhost:4173/`

### Large Image Size

1. Use `docker image inspect` with Rancher or `podman image inspect` with Podman to check layer sizes
2. Ensure multi-stage build is being used
3. Check for unnecessary files in build context (add to `.dockerignore`)

### Permission Denied Errors

The containers run as non-root users. Ensure mounted volumes have correct permissions:

```bash
# Fix permissions for mounted volumes
sudo chown -R 1001:1001 /path/to/volume
```

## Related Documentation

- [Azure Bicep Infrastructure](../Azure/Bicep/)
- [GitHub Actions Workflows](../../.github/workflows/)
- [Site-specific Dockerfiles](../../sites/)
- Use multi-stage builds to exclude build tools from production images
