# OpenTelemetry Frontend Guide

## Quick Reference for RFC 1001: OpenTelemetry Observability System

This guide provides practical examples for implementing OpenTelemetry tracing, logging, and metrics in the Next.js frontend.

Every telemetry helper in this guide is exported from the server-only module `sites/arolariu.ro/src/instrumentation.server.ts` (imported as
`@/instrumentation.server`), so Client Components cannot import them. The snippets are illustrative: business functions, types, and routes
such as `InvoiceData`, `saveInvoice`, and `/api/invoices` are placeholders. For live usage, see the invoice Server Actions in
`sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/` and `sites/arolariu.ro/src/app/api/user/route.ts`, which combines spans,
metrics, and logs.

## Quick Start

### 1. Import Telemetry Functions

```typescript
import {withSpan, addSpanEvent, setSpanAttributes, recordSpanError, logWithTrace} from "@/instrumentation.server";
```

### 2. Wrap Operations with Spans

```typescript
export async function fetchUserData(userId: string) {
  return withSpan("api.user.fetch", async (span) => {
    // Your code here
    const user = await fetch(`/api/user/${userId}`);
    return user.json();
  });
}
```

## Core Patterns

### Basic Span Creation

```typescript
import {withSpan} from "@/instrumentation.server";

export async function processInvoice(invoiceId: string) {
  return withSpan("business.invoice.process", async (span) => {
    // Operation name follows convention: category.subcategory.action
    // Categories: http.server, http.client, db, cache, api, component, page, auth, validation, business

    const invoice = await fetchInvoice({invoiceId});
    if (!invoice.success) return invoice;

    return analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});
  });
}
```

### Adding Span Attributes

```typescript
import {withSpan} from "@/instrumentation.server";

export async function createInvoice(data: InvoiceData) {
  return withSpan("api.invoice.create", async (span) => {
    // Add custom attributes to provide context
    span.setAttributes({
      "invoice.merchant_id": data.merchantId,
      "invoice.item_count": data.items.length,
      "invoice.total_amount": data.totalAmount,
      "invoice.currency": data.currency,
    });

    const result = await saveInvoice(data);

    // Add result attributes
    span.setAttributes({
      "invoice.id": result.id,
      "invoice.created": true,
    });

    return result;
  });
}
```

### Adding Span Events

```typescript
import {withSpan, addSpanEvent} from "@/instrumentation.server";

export async function uploadFile(file: File) {
  return withSpan("api.file.upload", async (span) => {
    addSpanEvent("file.validation.start");

    const isValid = await validateFile(file);
    if (!isValid) {
      addSpanEvent("file.validation.failed", {
        "file.name": file.name,
        "file.size": file.size,
      });
      throw new Error("Invalid file");
    }

    addSpanEvent("file.validation.success");
    addSpanEvent("file.upload.start");

    const url = await uploadToStorage(file);

    addSpanEvent("file.upload.complete", {
      "file.url": url,
    });

    return url;
  });
}
```

### Error Handling with Spans

```typescript
import {withSpan, recordSpanError} from "@/instrumentation.server";

export async function deleteInvoice(invoiceId: string) {
  return withSpan("api.invoice.delete", async (span) => {
    try {
      span.setAttributes({
        "invoice.id": invoiceId,
      });

      await performDelete(invoiceId);

      span.setAttributes({
        "invoice.deleted": true,
      });

      return {success: true};
    } catch (error) {
      // Automatically records exception and sets span status to error
      recordSpanError(error, "Failed to delete invoice");
      throw error;
    }
  });
}
```

### Server Component Tracing

```typescript
import {withSpan} from "@/instrumentation.server";
import {notFound} from "next/navigation";

export default async function InvoicePage(props: Readonly<PageProps<"/domains/invoices/view-invoice/[id]">>) {
  const {id} = await props.params;

  return withSpan("page.invoice.render", async (span) => {
    span.setAttributes({
      "page.route": "/domains/invoices/view-invoice/[id]",
      "page.invoice_id": id,
      "render.context": "server",
    });

    const result = await fetchInvoice({invoiceId: id});
    if (!result.success) notFound();

    span.setAttributes({"invoice.loaded": true});

    return <InvoiceDetails invoice={result.data} />;
  });
}
```

### API Route Tracing

```typescript
import {withSpan, logWithTrace} from "@/instrumentation.server";
import {NextResponse} from "next/server";

export async function GET() {
  return withSpan("http.server.invoice.get", async (span) => {
    span.setAttributes({
      "http.method": "GET",
      "http.route": "/api/invoices",
    });

    logWithTrace("info", "Fetching invoices", undefined, "api");

    // fetchInvoices() derives the caller's identity on the server, so no user ID is passed in.
    const result = await fetchInvoices();
    if (!result.success) return NextResponse.json({error: result.error.code}, {status: result.error.status ?? 500});

    span.setAttributes({
      "invoice.count": result.data.length,
      "http.status_code": 200,
    });

    logWithTrace("info", "Invoices fetched successfully", {count: result.data.length}, "api");

    return NextResponse.json(result.data);
  });
}
```

### JWT Token Operations

This mirrors the live `createJwtToken` in `sites/arolariu.ro/src/lib/utils.server.ts`:

```typescript
import {addSpanEvent, logWithTrace, recordSpanError, withSpan} from "@/instrumentation.server";
import {type JWTPayload, SignJWT} from "jose";

export async function createJwtToken(payload: Readonly<JWTPayload>, secret: Readonly<string>): Promise<Readonly<string>> {
  return withSpan("auth.jwt.create", async (span) => {
    try {
      const startTime = Date.now();

      span.setAttributes({
        "jwt.algorithm": "HS256",
        "jwt.subject": payload["sub"] ?? "unknown",
        "jwt.issuer": payload["iss"] ?? "unknown",
        "jwt.audience": payload["aud"] ?? "unknown",
      });

      addSpanEvent("jwt.signing.start");
      logWithTrace("debug", "Creating JWT token", {subject: payload["sub"]}, "server");

      const secretKey = new TextEncoder().encode(secret);
      const jwt = await new SignJWT(payload).setProtectedHeader({alg: "HS256", typ: "JWT"}).setIssuedAt().sign(secretKey);

      const duration = Date.now() - startTime;
      addSpanEvent("jwt.signing.complete", {
        "jwt.duration_ms": duration,
      });

      span.setAttributes({
        "jwt.created": true,
        "jwt.duration_ms": duration,
      });

      logWithTrace("info", "JWT token created successfully", {subject: payload["sub"], duration}, "server");

      return jwt;
    } catch (error) {
      recordSpanError(error, "Failed to create JWT token");
      const errorMessage = error instanceof Error ? error.message : "Failed to create JWT token";
      logWithTrace("error", "JWT token creation failed", {error: errorMessage}, "server");
      throw new Error(errorMessage, {cause: error});
    }
  });
}
```

## Logging

### Structured Logging with Trace Context

`logWithTrace` writes each entry to the console as JSON with the active `traceId` and `spanId`. When an exporter is configured, it also
emits the entry as an OpenTelemetry log record.

```typescript
import {logWithTrace} from "@/instrumentation.server";

// Log levels: debug, info, warn, error
// Render contexts: server, client, edge, api

export async function processPayment(amount: number) {
  logWithTrace("info", "Processing payment", {amount, currency: "USD"}, "server");

  try {
    const result = await chargeCard(amount);
    logWithTrace("info", "Payment successful", {transactionId: result.id}, "server");
    return result;
  } catch (error) {
    logWithTrace(
      "error",
      "Payment failed",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        amount,
      },
      "server",
    );
    throw error;
  }
}
```

### Debug Logging

`debug` entries are skipped when `NODE_ENV` is `production`.

```typescript
import {logWithTrace} from "@/instrumentation.server";

export function validateInvoiceData(data: InvoiceData) {
  logWithTrace(
    "debug",
    "Starting invoice validation",
    {
      merchantId: data.merchantId,
      itemCount: data.items.length,
    },
    "server",
  );

  // Validation logic...

  logWithTrace(
    "debug",
    "Invoice validation complete",
    {
      valid: true,
    },
    "server",
  );
}
```

## Semantic Attribute Helpers

The telemetry module exports positional helpers for common attribute sets: `createHttpServerAttributes`, `createHttpClientAttributes`,
`createNextJsAttributes`, `createDatabaseAttributes`, `createCacheAttributes`, `createAuthAttributes`, and `createErrorAttributes`.

### HTTP Server Attributes

```typescript
import {withSpan, createHttpServerAttributes} from "@/instrumentation.server";

export async function GET(request: NextRequest) {
  return withSpan("http.server.api.route", async (span) => {
    const attributes = createHttpServerAttributes("GET", 200, {
      route: "/api/invoices",
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    span.setAttributes(attributes);

    // Handle request...
  });
}
```

### HTTP Client Attributes

```typescript
import {withSpan, createHttpClientAttributes} from "@/instrumentation.server";

export async function fetchExternalAPI() {
  return withSpan("http.client.external.api", async (span) => {
    const attributes = createHttpClientAttributes("POST", "https://api.example.com/data", 200);

    span.setAttributes(attributes);

    const response = await fetch("https://api.example.com/data", {
      method: "POST",
    });

    return response.json();
  });
}
```

### Database Attributes

```typescript
import {withSpan, createDatabaseAttributes} from "@/instrumentation.server";

export async function queryInvoices(userId: string) {
  return withSpan("db.query.invoices", async (span) => {
    const attributes = createDatabaseAttributes("postgresql", "SELECT", {collection: "invoices"});

    span.setAttributes(attributes);

    const result = await db.query("SELECT * FROM invoices WHERE user_id = $1", [userId]);

    span.setAttributes({
      "db.rows_affected": result.rows.length,
    });

    return result.rows;
  });
}
```

### Cache Attributes

```typescript
import {withSpan, createCacheAttributes} from "@/instrumentation.server";

export async function getCachedInvoice(invoiceId: string) {
  return withSpan("cache.get.invoice", async (span) => {
    // hit starts as false and is updated after the lookup
    const attributes = createCacheAttributes("redis", "get", false, `invoice:${invoiceId}`);

    span.setAttributes(attributes);

    const cached = await redis.get(`invoice:${invoiceId}`);

    span.setAttributes({
      "cache.hit": cached !== null,
    });

    return cached ? JSON.parse(cached) : null;
  });
}
```

### Authentication Attributes

```typescript
import {withSpan, createAuthAttributes} from "@/instrumentation.server";

export async function authenticateUser(token: string) {
  return withSpan("auth.verify", async (span) => {
    // Starts unauthenticated and is updated after verification
    const attributes = createAuthAttributes(false, {method: "jwt"});

    span.setAttributes(attributes);

    try {
      const payload = await verifyToken(token);

      span.setAttributes({
        "user.authenticated": true,
        "auth.user_id": payload.sub,
      });

      return payload;
    } catch (error) {
      span.setAttributes({
        "auth.error": error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });
}
```

## Metrics

Create each instrument once at module scope with `createCounter`, `createHistogram`, or `createUpDownCounter`. Each takes
`(name, description?, unit?)`, and `name` must be a `MetricName`: a dotted name that starts with `http.server`, `http.client`, `db`,
`cache`, `api`, `user`, `page`, `component`, `business`, `website`, or `arolariu`. Instruments come from the `arolariu-website` meter, and
metrics are exported every 60 seconds when an exporter is configured. Keep metric attributes bounded: the live example records the route and
authentication method, never the user ID.

From `src/app/api/user/route.ts`:

```typescript
import {
  createAuthAttributes,
  createCounter,
  createHistogram,
  createHttpServerAttributes,
  createNextJsAttributes,
} from "@/instrumentation.server";

// Module scope: create each instrument once
const userRequestCounter = createCounter("user.api.requests", "Total number of /api/user requests", "1");
const requestDurationHistogram = createHistogram("api.user.duration", "Request duration in milliseconds", "ms");

// Inside the handler
userRequestCounter.add(1, {
  ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
  ...createNextJsAttributes("api", {runtime: "nodejs"}),
});

const duration = Date.now() - startTime;
requestDurationHistogram.record(duration, {
  ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
  ...createAuthAttributes(true, {method: "clerk"}),
});
```

## Trace Propagation

Outbound requests made with `fetchWithTimeout` (`src/lib/utils.server.ts`) carry the active trace context. It calls
`injectTraceContextHeaders`, which injects the W3C trace context (`traceparent`) and mirrors the trace ID to `X-Request-Id` when that header
is absent. This links website spans to API spans; see the [Distributed Tracing Reference](../backend/distributed-tracing.md).
`injectTraceContextHeaders(headers)` is exported for requests that bypass `fetchWithTimeout`. `getTraceparentHeader()` is a compatibility
helper that production code no longer calls.

## Span Naming Conventions

Follow these conventions for consistent tracing:

| Category      | Pattern                       | Example                             |
| ------------- | ----------------------------- | ----------------------------------- |
| HTTP Server   | `http.server.{route}`         | `http.server.invoice.get`           |
| HTTP Client   | `http.client.{service}`       | `http.client.external.api`          |
| Database      | `db.{operation}.{table}`      | `db.query.invoices`                 |
| Cache         | `cache.{operation}.{key}`     | `cache.get.invoice`                 |
| API           | `api.{resource}.{action}`     | `api.invoice.create`                |
| Server Action | `api.actions.{area}.{action}` | `api.actions.invoices.fetchInvoice` |
| Page          | `page.{route}.{action}`       | `page.invoice.render`               |
| Component     | `component.{name}.{action}`   | `component.chart.render`            |
| Auth          | `auth.{action}`               | `auth.jwt.create`                   |
| Validation    | `validation.{subject}`        | `validation.invoice.input`          |
| Business      | `business.{domain}.{action}`  | `business.invoice.process`          |

## Best Practices

### ✅ Do: Use Semantic Attribute Helpers

```typescript
// ✅ Good - uses helper
const attributes = createHttpServerAttributes("GET", 200, {route: "/api/invoices"});
span.setAttributes(attributes);
```

### ✅ Do: Add Business Context

```typescript
// ✅ Good - includes business metrics
span.setAttributes({
  "invoice.total_amount": invoice.paymentInformation.totalCostAmount,
  "invoice.item_count": invoice.items.length,
  "merchant.id": invoice.merchantReference,
});
```

### ✅ Do: Log Important Events

```typescript
// ✅ Good - logs key milestones
addSpanEvent("validation.complete");
addSpanEvent("database.save.start");
addSpanEvent("cache.invalidate");
```

### ✅ Do: Use Try-Catch with recordSpanError

```typescript
// ✅ Good - proper error recording
try {
  await operation();
} catch (error) {
  recordSpanError(error, "Operation failed");
  throw error;
}
```

### ❌ Don't: Use High-Cardinality Attributes

```typescript
// ❌ Bad - timestamp creates unique values
span.setAttributes({
  "request.timestamp": Date.now(), // High cardinality!
});

// ✅ Good - use events for timestamps
addSpanEvent("request.received");
```

### ❌ Don't: Add Sensitive Data

```typescript
// ❌ Bad - exposes passwords
span.setAttributes({
  "user.password": password, // Security risk!
  "credit_card.number": cardNumber, // PII!
});

// ✅ Good - only non-sensitive identifiers
span.setAttributes({
  "user.id": userId,
  "payment.method": "card",
});
```

### ❌ Don't: Create Spans for Trivial Operations

```typescript
// ❌ Bad - too granular
return withSpan("util.add", async () => {
  return a + b; // Not worth tracing
});

// ✅ Good - trace meaningful operations
return withSpan("business.calculate.total", async () => {
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;
  return total;
});
```

## Troubleshooting

### Issue: Spans Not Appearing

**Check**:

1. `register()` in `src/instrumentation.ts` calls `startTelemetry()` from `@/instrumentation.server` (Node.js runtime only)
2. An exporter variable is set: `APPLICATIONINSIGHTS_CONNECTION_STRING` or `OTEL_EXPORTER_OTLP_ENDPOINT` (see
   [Exporter Selection](#exporter-selection)); the startup log line that begins with `>>> 📡` names the selected exporter
3. The selected destination is reachable
4. The route is not a suppressed health path (`/health`, `/api/health`, or `/api/ready`)

**Solution**:

```bash
# Check environment
echo "$APPLICATIONINSIGHTS_CONNECTION_STRING"
echo "$OTEL_EXPORTER_OTLP_ENDPOINT"

# Test the OTLP endpoint when using a local collector
curl "$OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces"
```

### Issue: Span Attributes Missing

**Root Cause**: Attributes set after span ends

**Solution**:

```typescript
// ✅ Set attributes before span ends
return withSpan("business.example.operation", async (span) => {
  span.setAttributes({key: "value"}); // ← Before return
  return result;
});
```

### Issue: Performance Overhead

**Solution**: Use sampling for high-traffic routes

```typescript
// No sampler is configured in code, so the SDK reads `OTEL_TRACES_SAMPLER` (default: parent-based always-on).
// To sample in code, pass `sampler` to the `NodeSDK` in `src/instrumentation.server.ts`.
import {TraceIdRatioBasedSampler} from "@opentelemetry/sdk-trace-node";

const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
});
```

## Configuration

### Exporter Selection

`createExporters()` in `src/instrumentation.server.ts` uses the first match:

| Order | Condition                                   | Exporters                                                                                                                                   |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `APPLICATIONINSIGHTS_CONNECTION_STRING` set | Azure Monitor trace, metric, and log exporters, authenticated with `DefaultAzureCredential`; `AZURE_CLIENT_ID` selects the managed identity |
| 2     | `OTEL_EXPORTER_OTLP_ENDPOINT` set           | OTLP HTTP exporters at `{endpoint}/v1/traces`, `{endpoint}/v1/metrics`, and `{endpoint}/v1/logs`                                            |
| 3     | Neither set                                 | None from `createExporters()`; `logWithTrace` writes to the console only (see the SDK fallback below)                                       |

The code applies no default OTLP endpoint. Production sets `APPLICATIONINSIGHTS_CONNECTION_STRING` and `AZURE_CLIENT_ID` in
`infra/Azure/Bicep/sites/arolariu-ro.bicep`.

Case 3 is meant to disable export, and its startup log says so. However, the code then passes `NodeSDK` no trace exporter or metric reader,
so the SDK applies its own environment defaults: with `OTEL_TRACES_EXPORTER` and `OTEL_METRICS_EXPORTER` unset, it still exports traces and
metrics over OTLP (HTTP/protobuf) to `http://localhost:4318`, and they arrive only if a collector listens there. Setting both variables to
`none` turns this fallback off; `OTEL_SDK_DISABLED=true`, which the container smoke test uses, disables the SDK entirely.

Under Aspire, the AppHost's `AddNextJsApp` applies Aspire's default OTLP configuration, so case 2 applies: `OTEL_EXPORTER_OTLP_ENDPOINT` is
the dashboard's gRPC endpoint (`https://localhost:21030` in `tooling/src/AppHost/Properties/launchSettings.json`) and
`OTEL_EXPORTER_OTLP_PROTOCOL` is `grpc`, although these exporters always speak OTLP/HTTP. The exp service, by contrast, is pointed at the
HTTP endpoint explicitly in `tooling/src/AppHost/Applications/Exp/ExpResources.cs`. Aspire also sets `OTEL_SERVICE_NAME` (the resource name,
`website`), `OTEL_RESOURCE_ATTRIBUTES` (`service.instance.id`), and, in Development, `OTEL_TRACES_SAMPLER=always_on`.

### Other Environment Variables

| Variable                         | Effect                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `COMMIT_SHA`                     | `service.version` resource attribute                                                                                                                               |
| `HOSTNAME`                       | `service.instance.id` resource attribute; falls back to `node-<pid>`                                                                                               |
| `SITE_ENV`                       | `deployment.environment` resource attribute                                                                                                                        |
| `OTEL_SUPPRESS_HEALTH_TELEMETRY` | Health-path suppression (inbound and outbound spans for `/health`, `/api/health`, and `/api/ready`) is on by default; only `false` (case-insensitive) turns it off |

`sites/arolariu.ro/next.config.ts` inlines `COMMIT_SHA` and `SITE_ENV` at build time through its `env` block. The service name and the
remaining resource attributes are set in code: `service.name` is `arolariu-website`, `service.namespace` is `arolariu.ro`, `cloud.role` is
`website`, and `cloud.provider` is `azure`.

Repository code does not read `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_LOG_LEVEL`, or `OTEL_TRACES_SAMPLER`, but the
OpenTelemetry `NodeSDK` does. Its environment resource detector lets `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES` override the
code-defined resource attributes on traces and metrics; the separate log provider keeps the code values. `OTEL_LOG_LEVEL` enables the SDK's
diagnostic console logger, and `OTEL_TRACES_SAMPLER` selects the sampler because none is configured in code.

### Instrumentation Setup

`src/instrumentation.ts` starts the SDK for the Node.js runtime only, then loads runtime configuration:

```typescript
export async function register(): Promise<void> {
  // Initialize OpenTelemetry early in the application lifecycle
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

The `NodeSDK` itself is configured in `src/instrumentation.server.ts`: Node.js auto-instrumentations with file-system instrumentation
disabled, batched span export, and metric export every 60 seconds. `SIGTERM` and `SIGINT` handlers call `stopTelemetry()` to flush pending
telemetry before the process exits.

## Quick Reference

| Task                              | Function                                                                                             | Example                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Create span                       | `withSpan(name, fn, attributes?)`                                                                    | `withSpan("api.fetch", async (span) => {})`                    |
| Add attributes                    | `span.setAttributes({})`                                                                             | `span.setAttributes({"user.id": "123"})`                       |
| Add attributes to the active span | `setSpanAttributes(attributes)`                                                                      | `setSpanAttributes({"invoice.count": 3})`                      |
| Add event                         | `addSpanEvent(name, attrs?)`                                                                         | `addSpanEvent("cache.hit", {key: "invoice"})`                  |
| Record error                      | `recordSpanError(error, msg?)`                                                                       | `recordSpanError(err, "Failed")`                               |
| Log with trace                    | `logWithTrace(level, msg, attrs?, ctx?)`                                                             | `logWithTrace("info", "Success", {id: 1}, "server")`           |
| Build semantic attributes         | `createHttpServerAttributes(method, statusCode, options?)` and the other `create*Attributes` helpers | `createHttpServerAttributes("GET", 200, {route: "/api/user"})` |
| Create a metric                   | `createCounter(name, description?, unit?)`, `createHistogram`, `createUpDownCounter`                 | `createCounter("user.api.requests", "Total requests", "1")`    |
| Propagate trace context           | `injectTraceContextHeaders(headers)`                                                                 | `injectTraceContextHeaders(new Headers())`                     |
| Get a tracer or meter             | `getTracer(name?)`, `getMeter(name?)`                                                                | `getMeter()` (defaults to `arolariu-website`)                  |

## Additional Resources

- **[RFC 1001](../rfc/1001-opentelemetry-observability-system.md)**: Complete OpenTelemetry system documentation
- **Telemetry Module**: `sites/arolariu.ro/src/instrumentation.server.ts`
- **Instrumentation**: `sites/arolariu.ro/src/instrumentation.ts`
- **OpenTelemetry Docs**: <https://opentelemetry.io/docs/languages/js/>
- **Semantic Conventions**: <https://opentelemetry.io/docs/specs/semconv/>
