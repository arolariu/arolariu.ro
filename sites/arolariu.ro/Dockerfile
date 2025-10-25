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
COPY package.json ./
RUN npm install

# ========================================
# Stage 2: Build the application
# ========================================
FROM base AS builder
WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ========================================
# Stage 3: Prepare the production image
# ========================================
FROM base AS runner
WORKDIR /app
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["dumb-init","node","server.js"]
