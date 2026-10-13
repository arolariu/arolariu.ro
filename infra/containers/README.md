# Container Images for arolariu.ro

This directory contains production-grade Dockerfiles for building container images for all arolariu.ro sites.

## Features

All Dockerfiles include:

- ✅ **Multi-stage builds** for optimized image size
- ✅ **Non-root users** for security
- ✅ **Health checks** for container orchestration
- ✅ **OCI-compliant labels** for container metadata
- ✅ **Proper signal handling** (dumb-init/tini for zombie reaping)
- ✅ **Layer caching optimization** for faster builds
- ✅ **Security hardening** with minimal attack surface
- ✅ **Alpine-based images** where possible

## Available Files

| File | Site | Technology | Port | Base Image |
| --------------------- | --------------- | --------------------- | ---- | ------------------------- |
| `Dockerfile.frontend` | arolariu.ro | Next.js 16 + React 19 | 3000 | node:24-alpine |
| `Dockerfile.backend` | api.arolariu.ro | .NET 10 ASP.NET Core | 8080 | dotnet/aspnet:10.0-alpine |
| `Dockerfile.cv` | cv.arolariu.ro | SvelteKit + serve | 3000 | node:24-alpine |
| `Dockerfile.exp`      | exp.arolariu.ro | FastAPI + Uvicorn     | 8080 | python:3.12-slim          |

## Build Context

**Important:** All Dockerfiles are designed to be built from the **repository root**, not from the `infra/containers` directory or individual site directories.

```bash
# Correct: from repository root
npm run containers:build -- --engine rancher --target frontend

# Wrong: from infra/containers
cd infra/containers && npm run containers:build -- --engine rancher --target frontend  # ❌
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
artifacts. Frontend recipes build the local components package themselves and preserve the complete Next.js standalone hierarchy. Only
public website metadata values are build arguments. Provider-independent `NEXT_PUBLIC_*` values are selected from the
build-only `website_env` secret; private values are not passed to the compiler. The image helper and Compose select the generated
website `.env` as this secret, without embedding the file in an image or introducing provider-specific defaults.

Frontend `containers:run` requires the generated website `.env`, parses its quoted values and supplies them through the child process
environment with engine variable-name flags, never secret values in arguments. Exp `containers:run` requires
`sites/exp.arolariu.ro/config.docker.json` and mounts it read-only through `EXP_LOCAL_CONFIG_PATH`. Neither file is copied into an image.
Supply runtime configuration privately through the established environment contract. Authentication configuration and migration are
owned by their separate workstream; this container follow-up does not provision provider-specific cloud settings.

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

## Build Arguments

### Common Build Arguments

| Argument     | Description                     | Default   |
| ------------ | ------------------------------- | --------- |
| `COMMIT_SHA` | Git commit SHA for traceability | `unknown` |
| `BUILD_DATE` | ISO 8601 build timestamp | - |
| `VERSION` | Semantic version | `1.0.0` |

### Frontend-Specific

| Argument                | Description                      | Default   |
| ----------------------- | -------------------------------- | --------- |
| `NODE_VERSION` | Node.js major version | `24` |
| `AZURE_TENANT_ID`       | Azure AD tenant ID               | -         |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID            | -         |
| `AZURE_CLIENT_ID`       | Azure managed identity client ID | -         |
| `INFRA`                 | Infrastructure type              | `unknown` |

### Backend-Specific

| Argument | Description | Default |
| ----------------------- | -------------------------------- | ------------------------- |
| `DOTNET_VERSION` | .NET SDK/runtime version | `10.0` |
| `BUILD_CONFIGURATION` | Build configuration | `Release` |
| `API_NAME` | API service name | `arolariu-backend-api` |
| `API_URL` | API base URL | `https://api.arolariu.ro` |
| `AZURE_TENANT_ID` | Azure AD tenant ID | - |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | - |
| `AZURE_CLIENT_ID` | Azure managed identity client ID | - |
| `INFRA` | Infrastructure type | `unknown` |

## Environment Variables (Runtime)

### Frontend

Public configuration is supplied by CI as Docker build arguments. Configure
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as a GitHub environment secret in
each deployment environment. `SITE_*`, `COMMIT_SHA`, and `TIMESTAMP` remain
build-time inputs. Cloud builds do not generate or mount a website `.env`.

#### Configuring the public Clerk key in GitHub

In **Settings > Environments**, open `development` and add an environment secret
named `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` containing that Clerk instance's
`pk_test_...` value. In `production`, add the same secret name with the
`pk_live_...` value.

The workflow declares the input once in its global `env` block. Both jobs select
their deployment environment with `inputs.environment || 'development'`, so the
same-named input resolves to the matching environment's value. Preview pushes
and development dispatches use `DEVELOPMENT`; production dispatches use
`PRODUCTION`. Separate conditional key names are not necessary. Keep each public
key paired with the Clerk secret stored under the corresponding exp label.

If you prefer plain configuration variables for these public values, create
**repository-level** variables named `CLERK_PUBLISHABLE_KEY_DEVELOPMENT` and
`CLERK_PUBLISHABLE_KEY_PRODUCTION` under **Settings > Secrets and variables >
Actions > Variables**, and replace the global expression with:

```yaml
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ vars[inputs.environment == 'production' && 'CLERK_PUBLISHABLE_KEY_PRODUCTION' || 'CLERK_PUBLISHABLE_KEY_DEVELOPMENT'] }}
```

Do not substitute an environment-level `vars` value into the global expression:
[environment variables become available only after the job starts](https://docs.github.com/en/actions/reference/workflows-and-actions/variables#configuration-variable-precedence).
The configured environment secrets remain the workflow's supported default.
The variable expression selects a name before reading its value, so a missing
production key does not silently select the development key.

The existing Next.js `instrumentation.register()` hook awaits
`initializeRuntimeEnvironmentConfiguration()` before requests are served.
That method fetches the complete exp runtime document using the PRODUCTION or
DEVELOPMENT label selected by `SITE_ENV`; missing or unsupported environments
are rejected. Server-side reads use the initialized document, and runtime
configuration is applied to the Node process without logging values.

Local, Aspire, and selfhost modes use local exp when available and retain
dotenv values when it is unreachable. Invalid documents and cloud failures
stop initialization instead of silently substituting defaults. `.env` is
retained for local/offline use and deprecated for cloud deployment.
Set `INFRA=local` when using a local Azure identity to access other resources;
both startup and subsequent config reads then retain local exp routing.

The container keeps the standard `node server.js` entrypoint. Private values
are not baked into image layers. Restarting the Node server reloads changed
private configuration from exp.

The build workflow runs a bounded startup smoke test on the final image before
publishing it. It uses the image's normal entrypoint and runner-stage environment
(without setting `SITE_ENV` or private variables), plus a local exp fixture.
The test checks the requested exp label and the application's health report,
proving the build-time environment survives into runtime instrumentation.
Run it on a Linux Docker host after building an image:

```bash
node sites/arolariu.ro/tests/container/runtime-configuration.smoke.mjs <image> PRODUCTION
```

The fixture and test container are temporary; no real Azure services or credentials
are used.

| Variable | Description | Required |
| ----------------------------------- | ------------------------------------ | -------- |
| `SITE_ENV` | Public build input: PRODUCTION or DEVELOPMENT | Yes |
| `SITE_URL` / `SITE_NAME` | Public site metadata from CI | Build |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk key from GitHub configuration | Build |
| `CLERK_SECRET_KEY` | Runtime Clerk secret from exp, or local dotenv | Runtime |
| `API_JWT` | Runtime JWT signing secret from exp, or local dotenv | Runtime |
| `API_JWT_ISSUER` / `API_JWT_AUDIENCE` | Runtime JWT metadata from exp, or local dotenv | Runtime |
| `API_URL` / `STORAGE_BLOB_ENDPOINT` | Runtime service endpoints from exp, or local dotenv | Runtime |
| `RESEND_API_KEY` | Runtime email key; empty string disables email | Optional |
| `EXP_PROXY_URL` | Optional exp URL override, including bare-metal local exp | No |

### Backend

Most backend configuration is embedded at build time via build arguments.

### CV Site

| Variable | Description | Default |
| -------- | ----------- | --------- |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |

## Multi-Architecture Builds

For building multi-architecture images (amd64/arm64):

Use the engine-native multi-architecture build workflow for the selected runtime.
For local development, prefer the `npm run containers:build -- --engine <rancher|podman>` wrapper; publishing multi-architecture images remains a release pipeline concern.

## Health Checks

All containers include built-in health checks compatible with Docker Compose, Kubernetes, and Azure Container Apps.

| Container | Endpoint | Interval | Timeout | Start Period |
| --------- | ----------------------------- | -------- | ------- | ------------ |
| Backend | `GET /health` (port 8080) | 30s | 10s | 30s |
| Frontend | `GET /api/health` (port 3000) | 30s | 10s | 30s |
| CV | `GET /health` (port 3000) | 30s | 10s | 10s |

## Security

### Non-Root Users

| Container | User | UID | Group | GID |
| --------- | ----------- | ---- | ---------- | ---- |
| Frontend | `nextjs` | 1001 | `nodejs` | 1001 |
| Backend | `appuser` | 1001 | `appgroup` | 1001 |
| CV | `sveltekit` | 1001 | `nodejs` | 1001 |

### Image Hardening

- Alpine-based images for minimal attack surface
- No shell access in production images
- Read-only root filesystem support
- Dropped capabilities (where applicable)
- No SUID/SGID binaries

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
podman build -f infra/containers/Dockerfile.backend --target=security-scan -t scan .
```

## Compose Example

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: infra/containers/Dockerfile.frontend
      args:
        - COMMIT_SHA=${COMMIT_SHA}
        - VERSION=${VERSION}
    ports:
      - "3000:3000"
    environment:
      - SITE_ENV=development
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: .
      dockerfile: infra/containers/Dockerfile.backend
      args:
        - COMMIT_SHA=${COMMIT_SHA}
        - API_NAME=api.arolariu.ro
        - API_URL=http://localhost:8080
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  cv:
    build:
      context: .
      dockerfile: infra/containers/Dockerfile.cv
    ports:
      - "3001:3000"
```

## Troubleshooting

### Build Fails with "file not found"

Ensure you're building from the repository root, not from a subdirectory.

### Health Check Fails

1. Check container logs with the selected engine: `npm run dev:selfhost:logs -- --engine rancher` or `npm run dev:selfhost:logs -- --engine podman`
2. Verify the application started correctly
3. Check the health endpoint manually: `curl http://localhost:<port>/health`

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
