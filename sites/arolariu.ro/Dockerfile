FROM node:23-alpine AS base

# Install dumb-init and corepack, update and upgrade the system
RUN corepack enable && \
  apk update && apk upgrade && \
  apk add --no-cache libc6-compat && apk add dumb-init && rm -rf /var/cache/apk/*

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

FROM base AS builder
WORKDIR /app

COPY . .
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --immutable

# Build the project, after dependencies are installed
RUN yarn build

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
