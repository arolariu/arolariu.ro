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
|------|------|------------|------|------------|
| `Dockerfile.frontend` | arolariu.ro | Next.js 16 + React 19 | 3000 | node:24-alpine |
| `Dockerfile.backend` | api.arolariu.ro | .NET 10 ASP.NET Core | 8080 | dotnet/aspnet:10.0-alpine |
| `Dockerfile.cv` | cv.arolariu.ro | SvelteKit + serve | 3000 | node:24-alpine |

## Build Context

**Important:** All Dockerfiles are designed to be built from the **repository root**, not from the `infra/containers` directory or individual site directories.

```bash
# Correct: from repository root
docker build -f infra/containers/Dockerfile.frontend -t arolariu-frontend .

# Wrong: from infra/containers
cd infra/containers && docker build -f Dockerfile.frontend .  # ❌
```

## Build Commands

### Frontend (arolariu.ro)

```bash
# From repository root
docker build -f infra/containers/Dockerfile.frontend -t arolariu-frontend \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VERSION=1.0.0 \
  .

# Run
docker run -p 3000:3000 \
  -e SITE_ENV=production \
  arolariu-frontend
```

### Backend (api.arolariu.ro)

```bash
# From repository root
docker build -f infra/containers/Dockerfile.backend -t arolariu-backend \
  --build-arg API_NAME=api.arolariu.ro \
  --build-arg API_URL=https://api.arolariu.ro \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VERSION=1.0.0 \
  .

# Run
docker run -p 8080:8080 arolariu-backend

# Build specific stages
docker build -f infra/containers/Dockerfile.backend --target=test -t arolariu-backend-test .
docker build -f infra/containers/Dockerfile.backend --target=security-scan -t arolariu-backend-scan .
```

### CV Site (cv.arolariu.ro)

```bash
# From repository root
docker build -f infra/containers/Dockerfile.cv -t arolariu-cv \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VERSION=1.0.0 \
  .

# Run
docker run -p 3000:3000 arolariu-cv
```

## Build Arguments

### Common Build Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `COMMIT_SHA` | Git commit SHA for traceability | `unknown` |
| `BUILD_DATE` | ISO 8601 build timestamp | - |
| `VERSION` | Semantic version | `1.0.0` |

### Frontend-Specific

| Argument | Description | Default |
|----------|-------------|---------|
| `NODE_VERSION` | Node.js major version | `24` |
| `AZURE_TENANT_ID` | Azure AD tenant ID | - |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | - |
| `AZURE_CLIENT_ID` | Azure managed identity client ID | - |
| `INFRA` | Infrastructure type | `unknown` |

### Backend-Specific

| Argument | Description | Default |
|----------|-------------|---------|
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

The frontend requires environment variables at runtime:

| Variable | Description | Required |
|----------|-------------|----------|
| `SITE_ENV` | Environment (development/production) | Yes |
| `SITE_URL` | Site URL | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `RESEND_API_KEY` | Email service API key | Yes |
| `API_URL` | Backend API URL | Yes |
| `API_JWT` | API authentication token | Yes |

### Backend

Most backend configuration is embedded at build time via build arguments.

### CV Site

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |

## Multi-Architecture Builds

For building multi-architecture images (amd64/arm64):

```bash
# Create/use buildx builder
docker buildx create --use --name multiarch

# Build and push multi-arch image
docker buildx build --platform linux/amd64,linux/arm64 \
  -f infra/containers/Dockerfile.frontend \
  -t ghcr.io/arolariu/arolariu-frontend:latest \
  --push .

docker buildx build --platform linux/amd64,linux/arm64 \
  -f infra/containers/Dockerfile.backend \
  -t ghcr.io/arolariu/arolariu-backend:latest \
  --push .
```

## Health Checks

All containers include built-in health checks compatible with Docker Compose, Kubernetes, and Azure Container Apps.

| Container | Endpoint | Interval | Timeout | Start Period |
|-----------|----------|----------|---------|--------------|
| Backend | `GET /health` (port 8080) | 30s | 10s | 30s |
| Frontend | `GET /api/health` (port 3000) | 30s | 10s | 30s |
| CV | `GET /health` (port 3000) | 30s | 10s | 10s |

## Security

### Non-Root Users

| Container | User | UID | Group | GID |
|-----------|------|-----|-------|-----|
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
docker build -f infra/containers/Dockerfile.backend --target=security-scan -t scan .
```

## Docker Compose Example

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

1. Check container logs: `docker logs <container-id>`
2. Verify the application started correctly
3. Check the health endpoint manually: `curl http://localhost:<port>/health`

### Large Image Size

1. Use `docker image inspect` to check layer sizes
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
