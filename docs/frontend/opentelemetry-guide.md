# OpenTelemetry Frontend Guide

## Quick Reference for RFC 1001: OpenTelemetry Observability System

This guide provides practical examples for implementing OpenTelemetry tracing, logging, and metrics in the Next.js frontend.

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
    // Categories: http.server, http.client, db, cache, api, component, page, auth, business
    
    const invoice = await fetchInvoice(invoiceId);
    const result = await analyzeInvoice(invoice);
    
    return result;
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

export default async function InvoicePage({params}: {params: {id: string}}) {
  return withSpan("page.invoice.render", async (span) => {
    span.setAttributes({
      "page.route": "/invoices/[id]",
      "page.invoice_id": params.id,
      "render.context": "server",
    });
    
    const invoice = await fetchInvoice(params.id);
    
    span.setAttributes({
      "invoice.loaded": true,
      "invoice.merchant": invoice.merchantName,
    });
    
    return <InvoiceDetails invoice={invoice} />;
  });
}
```

### API Route Tracing

```typescript
import {withSpan, logWithTrace} from "@/instrumentation.server";
import {NextRequest, NextResponse} from "next/server";

export async function GET(request: NextRequest) {
  return withSpan("http.server.invoice.get", async (span) => {
    const {searchParams} = new URL(request.url);
    const userId = searchParams.get("userId");
    
    span.setAttributes({
      "http.method": "GET",
      "http.route": "/api/invoices",
      "user.id": userId ?? "anonymous",
    });
    
    logWithTrace("info", "Fetching invoices", {userId}, "server");
    
    const invoices = await fetchInvoices(userId);
    
    span.setAttributes({
      "invoice.count": invoices.length,
      "http.status_code": 200,
    });
    
    logWithTrace("info", "Invoices fetched successfully", {count: invoices.length}, "server");
    
    return NextResponse.json(invoices);
  });
}
```

### JWT Token Operations

```typescript
import {withSpan, addSpanEvent, logWithTrace} from "@/instrumentation.server";

export async function createJwtToken(payload: Record<string, any>, secret: string) {
  return withSpan("auth.jwt.create", async (span) => {
    const startTime = Date.now();
    
    span.setAttributes({
      "jwt.algorithm": "HS256",
      "jwt.subject": payload.sub ?? "unknown",
      "jwt.issuer": payload.iss ?? "unknown",
      "jwt.audience": payload.aud ?? "unknown",
    });
    
    addSpanEvent("jwt.signing.start");
    logWithTrace("debug", "Creating JWT token", {subject: payload.sub}, "server");
    
    const secretKey = new TextEncoder().encode(secret);
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({alg: "HS256", typ: "JWT"})
      .setIssuedAt()
      .sign(secretKey);
    
    const duration = Date.now() - startTime;
    
    addSpanEvent("jwt.signing.complete", {
      "jwt.duration_ms": duration,
    });
    
    span.setAttributes({
      "jwt.created": true,
      "jwt.duration_ms": duration,
    });
    
    logWithTrace("info", "JWT token created successfully", {subject: payload.sub, duration}, "server");
    
    return jwt;
  });
}
```

## Logging

### Structured Logging with Trace Context

```typescript
import {logWithTrace} from "@/instrumentation.server";

// Log levels: debug, info, warn, error
// Render contexts: server, client, edge

export async function processPayment(amount: number) {
  logWithTrace("info", "Processing payment", {amount, currency: "USD"}, "server");
  
  try {
    const result = await chargeCard(amount);
    logWithTrace("info", "Payment successful", {transactionId: result.id}, "server");
    return result;
  } catch (error) {
    logWithTrace("error", "Payment failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      amount,
    }, "server");
    throw error;
  }
}
```

### Debug Logging

```typescript
import {logWithTrace} from "@/instrumentation.server";

export function validateInvoiceData(data: InvoiceData) {
  logWithTrace("debug", "Starting invoice validation", {
    merchantId: data.merchantId,
    itemCount: data.items.length,
  }, "server");
  
  // Validation logic...
  
  logWithTrace("debug", "Invoice validation complete", {
    valid: true,
  }, "server");
}
```

## Semantic Attribute Helpers

The telemetry system provides pre-built helpers for common attribute patterns:

### HTTP Server Attributes

```typescript
import {withSpan, createHttpServerAttributes} from "@/instrumentation.server";

export async function GET(request: NextRequest) {
  return withSpan("http.server.api.route", async (span) => {
    const attributes = createHttpServerAttributes({
      method: "GET",
      route: "/api/invoices",
      statusCode: 200,
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
    const attributes = createHttpClientAttributes({
      method: "POST",
      url: "https://api.example.com/data",
      statusCode: 200,
    });
    
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
    const attributes = createDatabaseAttributes({
      system: "postgresql",
      operation: "SELECT",
      table: "invoices",
      rowsAffected: 0, // Will update after query
    });
    
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
    const attributes = createCacheAttributes({
      operation: "get",
      key: `invoice:${invoiceId}`,
      hit: false, // Will update after check
    });
    
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
    const attributes = createAuthAttributes({
      method: "jwt",
      userId: undefined, // Will set after verification
      success: false,
    });
    
    span.setAttributes(attributes);
    
    try {
      const payload = await verifyToken(token);
      
      span.setAttributes({
        "auth.user_id": payload.sub,
        "auth.success": true,
      });
      
      return payload;
    } catch (error) {
      span.setAttributes({
        "auth.success": false,
        "auth.error": error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });
}
```

## Span Naming Conventions

Follow these conventions for consistent tracing:

| Category | Pattern | Example |
|----------|---------|---------|
| HTTP Server | `http.server.{route}` | `http.server.invoice.get` |
| HTTP Client | `http.client.{service}` | `http.client.external.api` |
| Database | `db.{operation}.{table}` | `db.query.invoices` |
| Cache | `cache.{operation}.{key}` | `cache.get.invoice` |
| API | `api.{resource}.{action}` | `api.invoice.create` |
| Page | `page.{route}.{action}` | `page.invoice.render` |
| Component | `component.{name}.{action}` | `component.chart.render` |
| Auth | `auth.{action}` | `auth.jwt.create` |
| Business | `business.{domain}.{action}` | `business.invoice.process` |

## Best Practices

### ✅ Do: Use Semantic Attribute Helpers

```typescript
// ✅ Good - uses helper
const attributes = createHttpServerAttributes({
  method: "GET",
  route: "/api/invoices",
  statusCode: 200,
});
span.setAttributes(attributes);
```

### ✅ Do: Add Business Context

```typescript
// ✅ Good - includes business metrics
span.setAttributes({
  "invoice.total_amount": invoice.totalAmount,
  "invoice.item_count": invoice.items.length,
  "merchant.id": invoice.merchantId,
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

1. OpenTelemetry is initialized in `src/instrumentation.ts`
2. Environment variable `OTEL_EXPORTER_OTLP_ENDPOINT` is set
3. Exporter endpoint is reachable

**Solution**:

```bash
# Check environment
echo $OTEL_EXPORTER_OTLP_ENDPOINT

# Test endpoint
curl http://localhost:4318/v1/traces
```

### Issue: Span Attributes Missing

**Root Cause**: Attributes set after span ends

**Solution**:

```typescript
// ✅ Set attributes before span ends
return withSpan("operation", async (span) => {
  span.setAttributes({key: "value"}); // ← Before return
  return result;
});
```

### Issue: Performance Overhead

**Solution**: Use sampling for high-traffic routes

```typescript
// Configure in instrumentation.ts
import {TraceIdRatioBasedSampler} from "@opentelemetry/sdk-trace-node";

const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
});
```

## Configuration

### Environment Variables

```bash
# Required
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Optional
OTEL_SERVICE_NAME=arolariu.ro
OTEL_LOG_LEVEL=info
OTEL_TRACES_SAMPLER=always_on
```

### Instrumentation Setup

Located in `src/instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./telemetry");
  }
}
```

## Quick Reference

| Task | Function | Example |
|------|----------|---------|
| Create span | `withSpan(name, fn)` | `withSpan("api.fetch", async (span) => {})` |
| Add attributes | `span.setAttributes({})` | `span.setAttributes({"user.id": "123"})` |
| Add event | `addSpanEvent(name, attrs?)` | `addSpanEvent("cache.hit", {key: "invoice"})` |
| Record error | `recordSpanError(error, msg)` | `recordSpanError(err, "Failed")` |
| Log with trace | `logWithTrace(level, msg, data, ctx)` | `logWithTrace("info", "Success", {id: 1}, "server")` |

## Additional Resources

- **RFC 1001**: Complete OpenTelemetry system documentation
- **Telemetry Module**: `sites/arolariu.ro/src/telemetry.ts`
- **Instrumentation**: `sites/arolariu.ro/src/instrumentation.ts`
- **OpenTelemetry Docs**: <https://opentelemetry.io/docs/languages/js/>
- **Semantic Conventions**: <https://opentelemetry.io/docs/specs/semconv/>
