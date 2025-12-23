# Stage 0: Base image with system dependencies
FROM node:25-alpine AS base

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
RUN npm ci

# ========================================
# Stage 2: Build the application
# ========================================
FROM base AS builder
WORKDIR /app

# Environment variables from workflow context (Azure identity)
ARG AZURE_TENANT_ID
ARG AZURE_SUBSCRIPTION_ID
ARG AZURE_CLIENT_ID
ARG COMMIT_SHA
ARG INFRA

# Make them available during build (Next.js can embed these at build time)
ENV AZURE_TENANT_ID=${AZURE_TENANT_ID} \
    AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID} \
    AZURE_CLIENT_ID=${AZURE_CLIENT_ID} \
    COMMIT_SHA=${COMMIT_SHA} \
    INFRA=${INFRA}

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

RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/sites/arolariu.ro/public ./public
# The standalone output preserves the monorepo structure, so server.js is at sites/arolariu.ro/server.js
COPY --from=builder --chown=nextjs:nodejs /app/sites/arolariu.ro/.next/standalone/sites/arolariu.ro/ ./
# Copy the node_modules from the standalone output (contains only required dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/sites/arolariu.ro/.next/standalone/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/sites/arolariu.ro/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["dumb-init","node","server.js"]
