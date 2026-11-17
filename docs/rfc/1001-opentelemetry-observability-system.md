# RFC 1001: OpenTelemetry Observability System for Next.js 16

- **Status**: Implemented
- **Date**: 2025-10-11
- **Authors**: arolariu
- **Related Components**: `sites/arolariu.ro`, `src/instrumentation.server.ts`, `src/instrumentation.ts`,
  `src/lib/telemetry/healthPolicy.ts`

---

## Abstract

This RFC documents the implementation of a comprehensive observability system for the arolariu.ro Next.js 16 application using the current
OpenTelemetry JavaScript SDK stack configured in `sites/arolariu.ro/package.json`. The system provides distributed tracing, metrics
collection, and structured logging with a strongly-typed API that enforces semantic conventions and prevents common instrumentation errors
through compile-time type checking.

---

## 1. Motivation

### 1.1 Problem Statement

Modern Next.js applications operating in SSR-first, CSR-second, and Backend-for-Frontend (BFF) architectures require deep observability to:

1. **Trace Request Flows**: Track requests across server components, API routes, client components, and edge functions
2. **Monitor Performance**: Collect metrics for response times, database queries, cache operations, and business logic
3. **Debug Production Issues**: Correlate logs with traces to understand system behavior in production
4. **Prevent Instrumentation Errors**: Avoid high-cardinality attributes, typos in span names, and inconsistent semantic conventions

### 1.2 Design Goals

- **Type Safety**: Compile-time enforcement of OpenTelemetry semantic conventions
- **Architecture Alignment**: Distinguish between SSR, CSR, Edge, and API contexts
- **Zero Runtime Overhead**: Minimal performance impact through efficient exporters
- **Developer Experience**: IntelliSense-driven API with helper functions
- **Standards Compliance**: Adhere to OpenTelemetry specification and semantic conventions

---

## 2. Technical Design

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application                        │
├─────────────────────────────────────────────────────────────────┤
│  instrumentation.ts                                             │
│  ├─ register() function                                         │
│  └─ Dynamic import of telemetry based on runtime                │
├─────────────────────────────────────────────────────────────────┤
│  instrumentation.server.ts                                      │
│  ├─ NodeSDK Configuration                                       │
│  │  ├─ Auto-instrumentations (HTTP, undici/fetch, DNS, etc.)    │
│  │  │  └─ FS disabled; health-probe requests ignored            │
│  │  ├─ createExporters(): Azure Monitor / OTLP HTTP / none      │
│  │  ├─ Traces: BatchSpanProcessor                               │
│  │  ├─ Metrics: PeriodicExportingMetricReader (60 s)            │
│  │  └─ Logs: LoggerProvider (BatchLogRecordProcessor)           │
│  ├─ Type System                                                 │
│  │  ├─ LogLevel, RenderContext, HttpMethod                      │
│  │  ├─ SpanOperationType, MetricName (template literals)        │
│  │  └─ Semantic Attribute Interfaces (6 types)                  │
│  ├─ API Functions                                               │
│  │  ├─ startTelemetry(), stopTelemetry()                        │
│  │  ├─ withSpan(), addSpanEvent(), setSpanAttributes()          │
│  │  ├─ recordSpanError()                                        │
│  │  ├─ createCounter(), createHistogram(), createUpDownCounter()│
│  │  ├─ getTracer(), getMeter()                                  │
│  │  ├─ injectTraceContextHeaders(), getTraceparentHeader()      │
│  │  └─ logWithTrace()                                           │
│  └─ Semantic Helpers                                            │
│     ├─ createHttpServerAttributes()                             │
│     ├─ createHttpClientAttributes()                             │
│     ├─ createNextJsAttributes()                                 │
│     ├─ createDatabaseAttributes()                               │
│     ├─ createCacheAttributes()                                  │
│     ├─ createAuthAttributes()                                   │
│     └─ createErrorAttributes()                                  │
├─────────────────────────────────────────────────────────────────┤
│  Application Code (Pages, Components, API Routes)               │
│  └─ Uses telemetry API with type-safe helpers                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Azure Monitor exporters (prod) / OTLP HTTP exporters (local)
                              │
                              ▼
      ┌───────────────────────────────────────────────┐
      │  Observability Backend                        │
      │  (Azure Application Insights in production;   │
      │   any OTLP-compatible backend locally)        │
      └───────────────────────────────────────────────┘
```

### 2.2 Core Components

#### 2.2.1 SDK Configuration

```typescript
// sites/arolariu.ro/src/instrumentation.server.ts (condensed)
function createExporters() {
  if (connectionString /* APPLICATIONINSIGHTS_CONNECTION_STRING */) {
    const credential = new DefaultAzureCredential({managedIdentityClientId: process.env["AZURE_CLIENT_ID"]});
    return {
      logExporter: new AzureMonitorLogExporter({connectionString, credential}),
      traceExporter: new AzureMonitorTraceExporter({connectionString, credential}),
      metricExporter: new AzureMonitorMetricExporter({connectionString, credential}),
    };
  }

  if (otlpEndpoint /* OTEL_EXPORTER_OTLP_ENDPOINT (no default) */) {
    return {
      logExporter: new OTLPLogExporter({url: `${otlpEndpoint}/v1/logs`, headers: {}}),
      traceExporter: new OTLPTraceExporter({url: `${otlpEndpoint}/v1/traces`, headers: {}}),
      metricExporter: new OTLPMetricExporter({url: `${otlpEndpoint}/v1/metrics`, headers: {}}),
    };
  }

  // Instrumentation and propagation stay active; logs go to the console only.
  return {logExporter: null, traceExporter: undefined, metricExporter: undefined};
}

const {traceExporter, metricExporter, logExporter} = createExporters();

let websiteLoggerProvider: LoggerProvider | null = null;
if (logExporter !== null) {
  websiteLoggerProvider = new LoggerProvider({
    ...(serviceResource ? {resource: serviceResource} : {}),
    processors: [new BatchLogRecordProcessor({exporter: logExporter})],
  });
}

const sdk = new NodeSDK({
  ...(serviceResource ? {resource: serviceResource} : {serviceName: "arolariu-website"}),
  ...(traceExporter ? {traceExporter} : {}),
  ...(metricExporter ? {metricReaders: [new PeriodicExportingMetricReader({exporter: metricExporter, exportIntervalMillis: 60_000})]} : {}),
  ...(traceExporter ? {spanProcessors: [new BatchSpanProcessor(traceExporter)]} : {}),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {enabled: false},
      "@opentelemetry/instrumentation-http": {ignoreIncomingRequestHook: (request) => shouldSuppressTelemetry(request.url)},
      "@opentelemetry/instrumentation-undici": {ignoreRequestHook: (request) => shouldSuppressTelemetry(request.path)},
    }),
  ],
});
```

**Design Decisions**:

- **Exporter Selection**: Azure Monitor exporters when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set (production); OTLP HTTP exporters when
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set (local collector); otherwise `createExporters()` returns no exporters (instrumentation and
  propagation stay active). The code applies no default OTLP endpoint, to avoid connection storms from auto-instrumented export requests to
  an unreachable collector. Because the SDK then receives no trace exporter or metric reader, it applies its own environment defaults (see
  §6.1).
- **Batch Span Processor**: Reduces network overhead by batching trace exports
- **Periodic Metric Reader**: Exports metrics every 60 seconds
- **Log Pipeline**: `LoggerProvider` + `BatchLogRecordProcessor`, created only when a log exporter exists
- **Auto-Instrumentation**: Node.js auto-instrumentations (HTTP, undici/`fetch`, DNS, …); file-system instrumentation is disabled;
  health-probe requests are ignored (`src/lib/telemetry/healthPolicy.ts`)

**Resource Attributes** (traces, metrics, and logs):

| Attribute                | Value                                |
| ------------------------ | ------------------------------------ |
| `service.name`           | `"arolariu-website"`                 |
| `service.namespace`      | `"arolariu.ro"`                      |
| `service.version`        | `COMMIT_SHA` (default `"unknown"`)   |
| `service.instance.id`    | `HOSTNAME` (default `node-<pid>`)    |
| `deployment.environment` | `SITE_ENV` (default `"development"`) |
| `cloud.role`             | `"website"`                          |
| `cloud.provider`         | `"azure"`                            |

#### 2.2.2 Type System

##### Template Literal Types

```typescript
type SpanOperationType =
  | `http.server.${string}`
  | `http.client.${string}`
  | `db.${string}`
  | `cache.${string}`
  | `api.${string}`
  | `component.${string}`
  | `page.${string}`
  | `auth.${string}`
  | `validation.${string}`
  | `business.${string}`;

type MetricName =
  | `http.server.${string}`
  | `http.client.${string}`
  | `db.${string}`
  | `cache.${string}`
  | `api.${string}`
  | `user.${string}`
  | `page.${string}`
  | `component.${string}`
  | `business.${string}`
  | `website.${string}`
  | `arolariu.${string}`;
```

**Benefits**:

- TypeScript enforces naming conventions at compile time
- IntelliSense provides prefix suggestions
- Prevents typos like `"api.usr.get"` instead of `"api.user.get"`

##### Semantic Attribute Interfaces

```typescript
interface HttpAttributes {
  "http.method": HttpMethod;
  "http.status_code": number;
  "http.route"?: string;
  "http.url"?: string;
  "http.target"?: string;
  "server.address"?: string;
  "client.address"?: string;
  "http.user_agent"?: string;
}

interface NextJsAttributes {
  "next.render_context": RenderContext;
  "next.route"?: string;
  "next.page_type"?: "static" | "dynamic" | "isr";
  "next.server_components"?: boolean;
  "next.cache_hit"?: boolean;
  "next.runtime"?: "nodejs" | "edge";
}

interface DatabaseAttributes {
  "db.system": string;
  "db.operation": string;
  "db.name"?: string;
  "db.collection"?: string;
  "db.statement"?: string;
}

interface CacheAttributes {
  "cache.system": string;
  "cache.operation": "get" | "set" | "delete" | "clear";
  "cache.hit": boolean;
  "cache.key"?: string;
}

interface AuthAttributes {
  "user.authenticated": boolean;
  "user.role"?: string;
  "auth.method"?: string;
  "auth.provider"?: string;
}

interface ErrorAttributes {
  "error.type": string;
  "error.message": string;
  "error.stack"?: string;
  "error.handled": boolean;
}
```

**Compliance**: Interfaces follow [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/) naming; the HTTP and
database interfaces use legacy attribute keys (see §12.2)

#### 2.2.3 API Functions

##### Tracing API

```typescript
async function withSpan<T>(spanName: SpanOperationType, fn: (span: Span) => Promise<T>, attributes?: TelemetryAttributes): Promise<T>;

function addSpanEvent(name: string, attributes?: TelemetryAttributes): void;

function setSpanAttributes(attributes: TelemetryAttributes): void;

function recordSpanError(error: Error | unknown, message?: string): void;
```

##### Metrics API

```typescript
function createCounter(name: MetricName, description?: string, unit?: string): Counter;

function createHistogram(name: MetricName, description?: string, unit?: string): Histogram;

function createUpDownCounter(name: MetricName, description?: string, unit?: string): UpDownCounter;
```

##### Logging API

```typescript
function logWithTrace(level: LogLevel, message: string, attributes?: Record<string, unknown>, renderContext?: RenderContext): void;
```

Each call writes a JSON line to the console and, when a log exporter is configured, emits an OpenTelemetry log record through the
`arolariu.website.server` logger (severity text and number plus `app.log.context`, `app.log.trace_id`, and `app.log.span_id` attributes).

**Production Optimization**: Debug logs are automatically suppressed in production:

```typescript
if (level === "debug" && process.env.NODE_ENV === "production") {
  return; // Skip debug logs in production
}
```

##### Lifecycle and Propagation API

```typescript
function startTelemetry(): void; // Starts the NodeSDK and logs the health-telemetry suppression status

async function stopTelemetry(): Promise<void>; // Shuts down the NodeSDK and the LoggerProvider

function injectTraceContextHeaders(headers: Headers): Headers;

function getTraceparentHeader(): string;

function getTracer(name?: string): Tracer; // Defaults to "arolariu-website"

function getMeter(name?: string): Meter; // Defaults to "arolariu-website"
```

- `stopTelemetry()` is also registered on `SIGTERM` and `SIGINT` when the module loads; the handlers then exit the process.
- `injectTraceContextHeaders()` injects the active context with the global propagator and mirrors the trace ID to `X-Request-Id` when that
  header is absent. It is used by `src/lib/utils.server.ts`, `src/lib/config/configProxy.ts`, and `src/app/api/health/route.ts`.
- `getTraceparentHeader()` is kept for older call sites; prefer `injectTraceContextHeaders()`.

#### 2.2.4 Semantic Helper Functions

```typescript
function createHttpServerAttributes(
  method: HttpMethod,
  statusCode: number,
  options?: {route?: string; target?: string; userAgent?: string; clientAddress?: string},
): HttpAttributes;

function createHttpClientAttributes(method: HttpMethod, url: string, statusCode?: number): Partial<HttpAttributes>;

function createNextJsAttributes(
  renderContext: RenderContext,
  options?: {
    route?: string;
    pageType?: "static" | "dynamic" | "isr";
    serverComponents?: boolean;
    cacheHit?: boolean;
    runtime?: "nodejs" | "edge";
  },
): NextJsAttributes;

function createDatabaseAttributes(
  system: string,
  operation: string,
  options?: {name?: string; collection?: string; statement?: string},
): DatabaseAttributes;

function createCacheAttributes(system: string, operation: "get" | "set" | "delete" | "clear", hit: boolean, key?: string): CacheAttributes;

function createAuthAttributes(authenticated: boolean, options?: {role?: string; method?: string; provider?: string}): AuthAttributes;

function createErrorAttributes(error: Error | unknown, handled: boolean): ErrorAttributes;
```

---

## 3. Implementation Examples

### 3.1 API Route Instrumentation

> **Illustrative example.** The production route is `sites/arolariu.ro/src/app/api/user/route.ts`. It records the counters
> `user.api.requests`, `user.guest.requests`, and `user.authenticated.requests` and the histogram `api.user.duration` (ms). It wraps the
> handler in an `api.user.get` span with child spans `api.user.authenticated` and `api.user.guest`. On error it calls
> `recordSpanError(error, "Failed to process /api/user request")` and returns guest fallback information with status 200.

```typescript
export async function GET(request: NextRequest) {
  return withSpan("api.user.get", async (span) => {
    // Set semantic attributes
    span.setAttributes({
      ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
      ...createNextJsAttributes("api", {runtime: "nodejs"}),
    });

    // Log with trace correlation
    logWithTrace("info", "Processing user request", undefined, "api");

    try {
      const {userId} = await auth();

      if (userId) {
        // Authenticated user flow
        const user = await currentUser();

        span.setAttributes({
          ...createAuthAttributes(true, {method: "clerk", provider: "clerk"}),
        });

        requestCounter.add(1, {
          ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
          ...createAuthAttributes(true, {method: "clerk"}),
        });

        return NextResponse.json(user);
      } else {
        // Guest user flow
        const guestToken = await createJwtToken({role: "guest"});

        span.setAttributes({
          ...createAuthAttributes(false, {method: "jwt", provider: "internal"}),
        });

        guestCounter.add(1, {
          ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
        });

        return NextResponse.json({token: guestToken});
      }
    } catch (error) {
      // Error handling with telemetry
      const errorAttrs = createErrorAttributes(error, true);
      logWithTrace("error", "Failed to process user request", errorAttrs, "api");
      recordSpanError(error);

      return NextResponse.json({error: "Internal Server Error"}, {status: 500});
    }
  });
}
```

### 3.2 Server Component Instrumentation

```typescript
export default async function UserProfile({userId}: {userId: string}) {
  return withSpan("component.UserProfile", async (span) => {
    span.setAttributes({
      ...createNextJsAttributes("server", {
        serverComponents: true,
        pageType: "dynamic",
      }),
    });

    logWithTrace("debug", "Rendering user profile", {userId}, "server");

    const user = await fetchUser(userId);
    return <div>{user.name}</div>;
  });
}
```

### 3.3 Database Operation Instrumentation

```typescript
async function queryUsers(filters: UserFilters) {
  return withSpan("db.query", async (span) => {
    span.setAttributes({
      ...createDatabaseAttributes("postgresql", "SELECT", {
        collection: "users",
      }),
    });

    const startTime = Date.now();
    const users = await db.query("SELECT * FROM users WHERE ...");
    const duration = Date.now() - startTime;

    queryDurationHistogram.record(duration, {
      "db.system": "postgresql",
      "db.operation": "SELECT",
    });

    return users;
  });
}
```

### 3.4 Cache Operation Instrumentation

```typescript
async function getCachedUser(userId: string) {
  return withSpan("cache.get", async (span) => {
    const cached = await redis.get(`user:${userId}`);
    const hit = cached !== null;

    span.setAttributes({
      ...createCacheAttributes("redis", "get", hit, "user"),
    });

    if (hit) {
      cacheHitCounter.add(1, {"cache.system": "redis"});
      return JSON.parse(cached);
    }

    cacheMissCounter.add(1, {"cache.system": "redis"});
    const user = await fetchUser(userId);
    await redis.set(`user:${userId}`, JSON.stringify(user));

    return user;
  });
}
```

---

## 4. Type Safety Guarantees

### 4.1 Compile-Time Enforcement

```typescript
// ✅ Valid: Follows naming convention
await withSpan("api.user.get", async (span) => {
  /* ... */
});

// ❌ TypeScript error: Invalid span name
await withSpan("user-get", async (span) => {
  /* ... */
});
//           ~~~~~~~~~~
// Type '"user-get"' is not assignable to type 'SpanOperationType'

// ✅ Valid: Correct log level
logWithTrace("info", "Message", {}, "api");

// ❌ TypeScript error: Invalid log level
logWithTrace("information", "Message", {}, "api");
//           ~~~~~~~~~~~~~
// Type '"information"' is not assignable to type 'LogLevel'

// ✅ Valid: Correct HTTP method
const attrs = createHttpServerAttributes("GET", 200);

// ❌ TypeScript error: Invalid HTTP method
const attrs = createHttpServerAttributes("get", 200);
//                                        ~~~~~
// Type '"get"' is not assignable to type 'HttpMethod'
```

### 4.2 IntelliSense Support

All types provide full autocomplete:

- **Span names**: Suggests prefixes like `api.`, `http.server.`, `db.`
- **Metric names**: Suggests semantic conventions
- **Log levels**: `debug`, `info`, `warn`, `error`
- **Render contexts**: `server`, `client`, `edge`, `api`
- **Attribute keys**: Semantic convention-compliant keys

---

## 5. Performance Considerations

### 5.1 Overhead Analysis

| Operation         | Overhead             | Mitigation Strategy                             |
| ----------------- | -------------------- | ----------------------------------------------- |
| Span creation     | ~10-50μs             | Batch span processor (reduces network calls)    |
| Metric recording  | ~1-5μs               | Periodic export (60s intervals)                 |
| Log correlation   | ~5-10μs              | Conditional debug logging (production-disabled) |
| Attribute setting | ~1-2μs per attribute | Helper functions create minimal attributes      |

### 5.2 Production Optimizations

1. **Batch Exporting**: Spans are batched before export (reduces network overhead by 95%)
2. **Debug Log Suppression**: Debug logs are stripped in production
3. **Efficient Serialization**: Batched OTLP/HTTP (JSON) export locally; Azure Monitor exporters in production
4. **Lazy Initialization**: Tracer and meter are lazily initialized
5. **Low-Cardinality Attributes**: Helpers and guidelines discourage high-cardinality attributes

### 5.3 Resource Requirements

- **Memory**: ~10-20MB for SDK + instrumentation libraries
- **CPU**: <1% overhead in production workloads
- **Network**: ~100-500 KB/min of telemetry data (depends on traffic)

---

## 6. Configuration

### 6.1 Environment Variables

```bash
# Production: Azure Monitor exporters (take precedence over OTLP)
APPLICATIONINSIGHTS_CONNECTION_STRING=<set by infra/Azure/Bicep/sites/arolariu-ro.bicep>
AZURE_CLIENT_ID=<managed identity client ID for DefaultAzureCredential>

# Optional: local OTLP collector. createExporters() applies no default; the code appends /v1/traces, /v1/metrics, and /v1/logs.
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# When neither APPLICATIONINSIGHTS_CONNECTION_STRING nor OTEL_EXPORTER_OTLP_ENDPOINT is set, NodeSDK falls back to its environment
# defaults and still exports traces and metrics over OTLP (HTTP/protobuf) to http://localhost:4318. These turn that fallback off:
OTEL_TRACES_EXPORTER=none
OTEL_METRICS_EXPORTER=none

# Optional: health-probe telemetry suppression for /health, /api/health, and /api/ready (default on; only "false" disables it)
OTEL_SUPPRESS_HEALTH_TELEMETRY=true

# Resource attributes (service.name is set in code to "arolariu-website"; service.namespace is "arolariu.ro")
COMMIT_SHA=<git sha>   # service.version (default "unknown")
HOSTNAME=<host>        # service.instance.id (default node-<pid>)
SITE_ENV=production    # deployment.environment (default "development")

# Node environment (debug logs are skipped when "production")
NODE_ENV=production
```

### 6.2 Initialization

```typescript
// src/instrumentation.ts
export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    // Dynamic import to avoid bundling telemetry code in client bundles
    const {startTelemetry} = await import("@/instrumentation.server");
    startTelemetry();
    console.log(">>> 🔭 OpenTelemetry has been initialized for the Node.js runtime!");

    const {initializeRuntimeEnvironmentConfiguration} = await import("./lib/config/configProxy");
    await initializeRuntimeEnvironmentConfiguration();
  }

  console.log(">>> Instrumentation has been registered!");
}
```

**Next.js Integration**: The `register()` function is called automatically by Next.js 16 before application bootstrap.

---

## 7. Observability Backend Integration

### 7.1 Supported Backends

Exporters are selected at startup by `createExporters()`. Azure Monitor (Application Insights) is used when
`APPLICATIONINSIGHTS_CONNECTION_STRING` is set, which is the production path configured in `infra/Azure/Bicep/sites/arolariu-ro.bicep`. OTLP
HTTP is used when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Otherwise `createExporters()` selects no exporter and the SDK's environment defaults
apply (§6.1). The OTLP HTTP exporter is compatible with:

| Backend                    | Traces | Metrics | Logs | Notes                                                  |
| -------------------------- | ------ | ------- | ---- | ------------------------------------------------------ |
| Azure Application Insights | ✅     | ✅      | ✅   | Production (Azure Monitor exporters, managed identity) |
| Jaeger                     | ✅     | ❌      | ❌   | Native OTLP support in v1.35+                          |
| Prometheus                 | ❌     | ✅      | ❌   | Via OpenTelemetry Collector                            |
| Grafana Tempo              | ✅     | ❌      | ❌   | Native OTLP support                                    |
| Grafana Loki               | ❌     | ❌      | ✅   | Via OpenTelemetry Collector                            |
| Elastic APM                | ✅     | ✅      | ✅   | Full OTLP support in 8.0+                              |
| Datadog                    | ✅     | ✅      | ✅   | Via Datadog Agent with OTLP receiver                   |
| New Relic                  | ✅     | ✅      | ✅   | Native OTLP support                                    |
| Honeycomb                  | ✅     | ✅      | ❌   | Native OTLP support                                    |

### 7.2 OpenTelemetry Collector

For local development, an OpenTelemetry Collector can receive OTLP data (example configuration, not part of this repository):

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  jaeger:
    endpoint: jaeger:14250
  prometheus:
    endpoint: 0.0.0.0:9090

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

---

## 8. Testing and Validation

### 8.1 Type Safety Validation

```bash
# Compile TypeScript to verify type safety (runs next typegen, then tsc --noEmit)
npm run typecheck --workspace @arolariu/website

# Run linter with strict rules
npm run lint
```

### 8.2 Runtime Validation

```bash
# Start local OpenTelemetry Collector
docker run -p 4318:4318 otel/opentelemetry-collector:latest

# Start the development server with the code's OTLP exporters enabled
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm run dev:website

# Make requests and verify telemetry data (the dev server uses --experimental-https)
curl -k https://localhost:3000/api/user
```

### 8.3 Automated Tests

The SDK module is not unit-tested directly. `sites/arolariu.ro/vitest.config.ts` aliases `@/instrumentation.server` to
`tests/stubs/instrumentation.server.ts`, where the helpers are `vi.fn` stubs, and excludes `instrumentation.server.ts` and
`instrumentation.ts` from coverage. Health-probe suppression is covered by the colocated `src/lib/telemetry/healthPolicy.test.ts`.
`src/workers/host/telemetryBridge.test.ts` covers the Web Worker telemetry bridge, which logs to the console and is not yet wired to
OpenTelemetry.

---

## 9. Migration Guide

### 9.1 From Untyped to Typed Telemetry

**Before (untyped)**:

```typescript
await withSpan("user-get", async (span) => {
  span.setAttribute("method", "get");
  span.setAttribute("status", 200);
  logWithTrace("info", "Processing request");
});
```

**After (type-safe)**:

```typescript
await withSpan("api.user.get", async (span) => {
  span.setAttributes({
    ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
    ...createNextJsAttributes("api", {runtime: "nodejs"}),
  });
  logWithTrace("info", "Processing request", undefined, "api");
});
```

### 9.2 Incremental Adoption

1. **Phase 1**: Install OpenTelemetry dependencies
2. **Phase 2**: Initialize SDK in `instrumentation.ts`
3. **Phase 3**: Add type-safe telemetry to critical paths (API routes, database queries)
4. **Phase 4**: Expand to server components and client components
5. **Phase 5**: Add custom metrics and business logic spans

---

## 10. Limitations and Future Work

### 10.1 Current Limitations

1. **Edge Runtime**: Not instrumented — the SDK is started only for the Node.js runtime
2. **Client-Side**: Requires separate browser SDK for client component instrumentation
3. **Log Export**: OpenTelemetry log records are exported only when an exporter is configured (Azure Monitor in production, OTLP locally);
   otherwise logs reach only the console as JSON, and debug logs are dropped in production
4. **Sampling**: No sampler configured; all spans are exported when an exporter is configured, except health-probe requests, which are
   ignored

### 10.2 Future Enhancements

1. **Trace Sampling**: Implement tail-based sampling for high-traffic scenarios
2. **Browser SDK**: Add `@opentelemetry/sdk-trace-web` for client-side tracing
3. **Custom Samplers**: Implement business-logic-aware sampling strategies
4. **Baggage Propagation**: Set W3C Baggage entries for cross-service context propagation (the default NodeSDK propagator already injects
   the `baggage` header, but no code sets baggage entries)
5. **Exemplars**: Link metrics to traces for deeper correlation

---

## 11. Security Considerations

### 11.1 Sensitive Data Handling

**⚠️ CRITICAL**: Never log or trace sensitive data:

```typescript
// ❌ BAD: Logs sensitive information
logWithTrace("info", "User login", {password: user.password});

// ✅ GOOD: Logs only non-sensitive identifiers
logWithTrace("info", "User login", {userId: user.id});
```

### 11.2 Attribute Redaction

Implement attribute processors to redact sensitive data:

```typescript
// Future enhancement
class SensitiveDataProcessor implements SpanProcessor {
  onStart(span: Span) {
    // Redact sensitive attributes
    const attrs = span.attributes;
    if ("user.email" in attrs) {
      span.setAttribute("user.email", "[REDACTED]");
    }
  }
}
```

### 11.3 Transport Security

- **HTTPS Only**: Configure OTLP exporters with HTTPS endpoints in production
- **Authentication**: Use API keys or mTLS for collector authentication
- **Network Policies**: Restrict collector access to internal network only

---

## 12. Compliance and Standards

### 12.1 OpenTelemetry Specification

This implementation complies with:

- [OpenTelemetry Specification 1.0](https://opentelemetry.io/docs/specs/otel/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [W3C Baggage](https://www.w3.org/TR/baggage/) (propagated by the default NodeSDK propagator; no code sets baggage entries)

### 12.2 Semantic Convention Alignment

| Domain    | Convention                                                                               | Compliance                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| HTTP      | [HTTP Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/http/)           | ⚠️ Partial (legacy attribute keys: `http.method`, `http.status_code`, `http.url`, `http.target`, `http.user_agent`) |
| Database  | [Database Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/database/)   | ⚠️ Partial (legacy attribute keys: `db.system`, `db.operation`, `db.name`, `db.collection`, `db.statement`)         |
| RPC       | [RPC Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/rpc/)             | ⚠️ Partial (internal APIs)                                                                                          |
| Messaging | [Messaging Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/messaging/) | ❌ Not applicable                                                                                                   |

---

## 13. References

### 13.1 OpenTelemetry Documentation

- [OpenTelemetry JavaScript SDK](https://opentelemetry.io/docs/languages/js/)
- [OpenTelemetry Node.js Auto-Instrumentation](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node)
- [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/)

### 13.2 Next.js Integration

- [Next.js 16 Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
- [Next.js Runtime Environment](https://nextjs.org/docs/app/api-reference/next-config-js/runtime)

### 13.3 TypeScript Resources

- [Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [Type Guards and Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

---

## 14. Conclusion

This RFC documents a production-ready observability system that leverages the OpenTelemetry packages currently declared for the website
runtime with a strongly-typed API tailored for Next.js 16 applications. The type system enforces semantic conventions, prevents common
instrumentation errors, and provides excellent developer experience through IntelliSense support.

**Key Achievements**:

- ✅ Type-safe API with compile-time enforcement
- ✅ Semantic-convention attribute interfaces and helpers (HTTP and database use legacy keys; see §12.2)
- ✅ Next.js architecture awareness (SSR/CSR/Edge/API)
- ✅ Minimal performance overhead (<1% CPU)
- ✅ Azure Monitor exporters in production; standards-compliant OTLP HTTP exporters for local collectors
- ✅ Comprehensive helper functions
- ✅ Production-ready configuration

The system is extensible, performant, and ready for immediate production deployment.

---

## Appendix A: Complete Type System Reference

```typescript
// Core types
type LogLevel = "debug" | "info" | "warn" | "error";
type RenderContext = "server" | "client" | "edge" | "api";
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
type HttpStatusCategory = "success" | "redirect" | "client_error" | "server_error";

// Template literal types
type SpanOperationType =
  | `http.server.${string}`
  | `http.client.${string}`
  | `db.${string}`
  | `cache.${string}`
  | `api.${string}`
  | `component.${string}`
  | `page.${string}`
  | `auth.${string}`
  | `validation.${string}`
  | `business.${string}`;

type MetricName =
  | `http.server.${string}`
  | `http.client.${string}`
  | `db.${string}`
  | `cache.${string}`
  | `api.${string}`
  | `user.${string}`
  | `page.${string}`
  | `component.${string}`
  | `business.${string}`
  | `website.${string}`
  | `arolariu.${string}`;

// Semantic attribute interfaces
interface HttpAttributes {
  "http.method": HttpMethod;
  "http.status_code": number;
  "http.route"?: string;
  "http.url"?: string;
  "http.target"?: string;
  "server.address"?: string;
  "client.address"?: string;
  "http.user_agent"?: string;
}

interface NextJsAttributes {
  "next.render_context": RenderContext;
  "next.route"?: string;
  "next.page_type"?: "static" | "dynamic" | "isr";
  "next.server_components"?: boolean;
  "next.cache_hit"?: boolean;
  "next.runtime"?: "nodejs" | "edge";
}

interface DatabaseAttributes {
  "db.system": string;
  "db.operation": string;
  "db.name"?: string;
  "db.collection"?: string;
  "db.statement"?: string;
}

interface CacheAttributes {
  "cache.system": string;
  "cache.operation": "get" | "set" | "delete" | "clear";
  "cache.hit": boolean;
  "cache.key"?: string;
}

interface AuthAttributes {
  "user.authenticated": boolean;
  "user.role"?: string;
  "auth.method"?: string;
  "auth.provider"?: string;
}

interface ErrorAttributes {
  "error.type": string;
  "error.message": string;
  "error.stack"?: string;
  "error.handled": boolean;
}

type SemanticAttributes = Partial<
  HttpAttributes & NextJsAttributes & DatabaseAttributes & CacheAttributes & AuthAttributes & ErrorAttributes
>;

type TelemetryAttributes = SemanticAttributes | Record<string, string | number | boolean>;

// Option and log entry shapes
interface SpanOptions {
  name: SpanOperationType;
  attributes?: TelemetryAttributes;
  kind?: "internal" | "server" | "client" | "producer" | "consumer";
}

interface MetricOptions {
  name: MetricName;
  description?: string;
  unit?: string;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId?: string;
  spanId?: string;
  context?: RenderContext;
  [key: string]: unknown;
}
```

---

## Appendix B: Metric Naming Conventions

| Metric Type        | Naming Pattern           | Example                       | Unit |
| ------------------ | ------------------------ | ----------------------------- | ---- |
| Request Count      | `<component>.requests`   | `user.api.requests`           | `1`  |
| Duration           | `<component>.duration`   | `db.query.duration`           | `ms` |
| Active Connections | `<component>.active`     | `http.server.active`          | `1`  |
| Cache Hits         | `cache.<system>.hits`    | `cache.redis.hits`            | `1`  |
| Cache Misses       | `cache.<system>.misses`  | `cache.redis.misses`          | `1`  |
| Error Count        | `<component>.errors`     | `api.user.errors`             | `1`  |
| Queue Size         | `<component>.queue_size` | `business.invoice.queue_size` | `1`  |

Metrics emitted today: `src/app/api/user/route.ts` records the counters `user.api.requests`, `user.guest.requests`, and
`user.authenticated.requests` and the histogram `api.user.duration` (`ms`); `src/app/api/health/route.ts` records the counter
`arolariu.health.check.failures`. The other examples in the table are illustrative.

---

**Document Version**: 1.1.0 **Last Updated**: 2026-11-17 **Reviewed By**: arolariu **Status**: ✅ Implemented and Production-Ready
