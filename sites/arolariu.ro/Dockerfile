# Stage 0: Base image with system dependencies
FROM node:24-alpine AS base

# Install system dependencies
RUN corepack enable && \
  apk update && apk upgrade && \
  apk add --no-cache libc6-compat dumb-init && \
  rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# ========================================
# Stage 1: Install dependencies
# ========================================
FROM base AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY tsconfig.json vitest.config.ts ./

# Copy workspace package manifests
COPY packages/components/package.json ./packages/components/
COPY sites/arolariu.ro/package.json ./sites/arolariu.ro/

# Install all dependencies (this resolves workspace links)
RUN --mount=type=secret,id=npm_config,target=/root/.npmrc npm ci

# ========================================
# Stage 2: Build the application
# ========================================
FROM base AS builder
WORKDIR /app

# Environment variables from workflow context (Azure identity + build-time inlining)
ARG AZURE_TENANT_ID
ARG AZURE_SUBSCRIPTION_ID
ARG AZURE_CLIENT_ID
ARG COMMIT_SHA
ARG INFRA
# next.config.ts env block: inlined into the JS bundle at build time
ARG SITE_ENV
ARG SITE_URL
ARG SITE_NAME
# NEXT_PUBLIC_ prefix → Next.js also replaces this in the client bundle at build time
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuYXVkaXQuaW52YWxpZCQ
ARG USE_CDN=false

# Make them available during build (Next.js embeds these at build time)
# NOTE: SITE_ENV / SITE_URL / SITE_NAME / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
#       are intentionally NOT propagated to the runner stage — they are baked into the
#       .next/standalone bundle and do not need to be re-set as container runtime envs.
ENV AZURE_TENANT_ID=${AZURE_TENANT_ID} \
    AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID} \
    AZURE_CLIENT_ID=${AZURE_CLIENT_ID} \
    COMMIT_SHA=${COMMIT_SHA} \
    INFRA=${INFRA} \
    SITE_ENV=${SITE_ENV} \
    SITE_URL=${SITE_URL} \
    SITE_NAME=${SITE_NAME} \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    USE_CDN=${USE_CDN}

# Copy everything from deps (includes node_modules with workspace links)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/tsconfig.json ./tsconfig.json
COPY --from=deps /app/vitest.config.ts ./vitest.config.ts

# Copy the components package source (needed for workspace link)
COPY packages/components/ ./packages/components/

# Copy the website source
COPY sites/arolariu.ro/ ./sites/arolariu.ro/

RUN npm run build --workspace=@arolariu/components

# Fail fast when host-side taxonomy generation was skipped.
RUN test "$(find sites/arolariu.ro/src/data/taxonomies -maxdepth 1 -type f -name 'gpc-*.min.json' -size +0c | wc -l)" -eq 1 \
  && test "$(find sites/arolariu.ro/src/data/taxonomies -maxdepth 1 -type f -name 'ecoicop-*.min.json' -size +0c | wc -l)" -eq 1 \
  && test "$(find sites/arolariu.ro/src/data/taxonomies -maxdepth 1 -type f -name 'nace-*.min.json' -size +0c | wc -l)" -eq 1

# Build the website
WORKDIR /app/sites/arolariu.ro
RUN npm run build

# ========================================
# Stage 3: Prepare the production image
# ========================================
FROM base AS runner
WORKDIR /app

# Re-declare ARGs to make them available in this stage
ARG AZURE_TENANT_ID
ARG AZURE_SUBSCRIPTION_ID
ARG AZURE_CLIENT_ID
ARG COMMIT_SHA
ARG INFRA

# Set runtime environment variables
ENV AZURE_TENANT_ID=${AZURE_TENANT_ID} \
    AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID} \
    AZURE_CLIENT_ID=${AZURE_CLIENT_ID} \
    COMMIT_SHA=${COMMIT_SHA} \
    INFRA=${INFRA}

COPY --from=builder --chown=nextjs:nodejs /app/sites/arolariu.ro/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/sites/arolariu.ro/public ./sites/arolariu.ro/public
COPY --from=builder --chown=nextjs:nodejs /app/sites/arolariu.ro/.next/static ./sites/arolariu.ro/.next/static

WORKDIR /app/sites/arolariu.ro

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["dumb-init","node","server.js"]
