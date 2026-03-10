###############################################################################
# Experimentation microservice (exp.arolariu.ro)
# Stateless FastAPI configuration proxy running on uvicorn.
#
# Key hardening:
#   - Multi-stage build to exclude pip, build tools, and dev artifacts
#   - Non-root user (app:app, UID/GID 1001)
#   - Read-only compatible (no runtime writes required)
#   - Minimal attack surface (slim base, non-root user)
#   - Health check for container orchestration
#   - dumb-init for proper PID 1 signal handling
###############################################################################

# ========================================
# Stage 1: Install dependencies
# ========================================
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

COPY requirements.txt ./
RUN pip install --no-cache-dir --target=/build/deps -r requirements.txt

# ========================================
# Stage 2: Production image
# ========================================
FROM python:3.12-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/deps \
    PORT=80

# Install dumb-init for proper signal handling (PID 1 zombie reaping)
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 --ingroup app app

WORKDIR /app

# Copy pre-built dependencies from builder
COPY --from=builder /build/deps ./deps

# Copy application source (excludes test/dev files via .dockerignore)
COPY . .

# Transfer ownership to non-root user
RUN chown -R app:app /app

USER app

EXPOSE 80

LABEL org.opencontainers.image.title="exp.arolariu.ro" \
      org.opencontainers.image.description="Stateless configuration proxy for the arolariu.ro platform" \
      org.opencontainers.image.url="https://exp.arolariu.ro" \
      org.opencontainers.image.source="https://github.com/arolariu/arolariu.ro" \
      org.opencontainers.image.vendor="arolariu" \
      org.opencontainers.image.licenses="MIT"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:80/api/health || exit 1

CMD ["dumb-init", "python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--workers", "1"]
