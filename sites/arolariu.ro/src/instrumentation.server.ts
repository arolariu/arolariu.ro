import "server-only";

/**
 * @fileoverview OpenTelemetry configuration, initialization, and utilities
 *
 * This module provides comprehensive observability capabilities for the application including:
 * - Distributed tracing with automatic and manual instrumentation
 * - Metrics collection (counters, histograms, up/down counters)
 * - Structured logging with trace correlation
 * - OTLP HTTP exporters for traces and metrics
 *
 * NOTE: This file exceeds max-lines due to comprehensive telemetry utilities.
 * Splitting would reduce cohesion of related observability functions.
 * See RFC 1001 for architectural justification.
 * @module telemetry
 * @see {@link https://opentelemetry.io/docs/languages/js/getting-started/nodejs/}
 * @see {@link https://opentelemetry.io/docs/specs/otel/}
 * @example
 * // Initialize in instrumentation.ts
 * import { startTelemetry } from '@/lib/telemetry';
 * startTelemetry();
 * @example
 * // Use in application code
 * import { withSpan, createCounter, logWithTrace } from '@/lib/telemetry';
 *
 * const counter = createCounter('requests.total', 'Total number of requests');
 * counter.add(1, { method: 'GET' });
 *
 * await withSpan('operation.name', async (span) => {
 *   span.setAttribute('user.id', userId);
 *   logWithTrace('info', 'Processing request', { userId });
 *   return await doWork();
 * });
 */

/* eslint-disable max-lines -- Comprehensive telemetry module with related observability utilities. See RFC 1001. Splitting would reduce cohesion. */

// #region Imports

import {DefaultAzureCredential} from "@azure/identity";
import {AzureMonitorMetricExporter, AzureMonitorTraceExporter} from "@azure/monitor-opentelemetry-exporter";
import {context, Meter, metrics, Span, SpanStatusCode, trace, Tracer} from "@opentelemetry/api";
import {getNodeAutoInstrumentations} from "@opentelemetry/auto-instrumentations-node";
import {OTLPMetricExporter} from "@opentelemetry/exporter-metrics-otlp-http";
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-http";
import {PeriodicExportingMetricReader} from "@opentelemetry/sdk-metrics";
import {NodeSDK} from "@opentelemetry/sdk-node";
import {BatchSpanProcessor} from "@opentelemetry/sdk-trace-node";

// #endregion

// #region Types

/**
 * Log levels for structured logging.
 * @remarks
 * - `info`: Informational messages about normal application operation
 * - `warn`: Warning messages for potentially harmful situations
 * - `error`: Error messages for serious problems and failures
 * - `debug`: Detailed debug information (development only)
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Rendering context for Next.js operations.
 * @remarks
 * - `server`: Server-side rendering (SSR) or server components
 * - `client`: Client-side rendering (CSR) after hydration
 * - `edge`: Edge runtime (middleware, edge functions)
 * - `api`: Backend-for-Frontend API routes
 */
export type RenderContext = "server" | "client" | "edge" | "api";

/**
 * HTTP methods supported by the application.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

/**
 * Common HTTP status code categories.
 */
export type HttpStatusCategory = "success" | "redirect" | "client_error" | "server_error";

/**
 * Operation types for span naming.
 * @remarks
 * Use these prefixes for consistent span naming:
 * - `http.server.*`: Incoming HTTP requests
 * - `http.client.*`: Outgoing HTTP requests
 * - `db.*`: Database operations
 * - `cache.*`: Cache operations
 * - `api.*`: API route handlers
 * - `component.*`: React component rendering
 * - `page.*`: Page rendering operations
 * - `auth.*`: Authentication operations
 * - `validation.*`: Data validation
 * - `business.*`: Business logic operations
 */
export type SpanOperationType =
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

/**
 * Metric name types for type-safe metric creation.
 * @remarks
 * Follow OpenTelemetry semantic conventions:
 * - Use dots for namespacing (e.g., `http.server.requests`)
 * - Include units in the name (e.g., `.duration`, `.size.bytes`)
 * - Use plural for counters (e.g., `requests`, `errors`)
 */
export type MetricName =
  | `http.server.${string}`
  | `http.client.${string}`
  | `db.${string}`
  | `cache.${string}`
  | `api.${string}`
  | `user.${string}`
  | `page.${string}`
  | `component.${string}`
  | `business.${string}`;

/**
 * Standard semantic attribute keys for HTTP operations.
 * @see {@link https://opentelemetry.io/docs/specs/semconv/http/}
 */
export interface HttpAttributes {
  /**
   * HTTP request method
   */
  "http.method": HttpMethod;

  /**
   * HTTP response status code
   */
  "http.status_code": number;

  /**
   * HTTP route pattern (e.g., "/api/users/:id")
   */
  "http.route"?: string;

  /**
   * Full HTTP request URL
   */
  "http.url"?: string;

  /**
   * HTTP request target (path + query string)
   */
  "http.target"?: string;

  /**
   * Server address (host)
   */
  "server.address"?: string;

  /**
   * Client IP address
   */
  "client.address"?: string;

  /**
   * User agent string
   */
  "http.user_agent"?: string;
}

/**
 * Standard semantic attribute keys for Next.js rendering operations.
 */
export interface NextJsAttributes {
  /**
   * Rendering context (server, client, edge, api)
   */
  "next.render_context": RenderContext;

  /**
   * Next.js route pattern
   */
  "next.route"?: string;

  /**
   * Page type (static, dynamic, ISR)
   */
  "next.page_type"?: "static" | "dynamic" | "isr";

  /**
   * Whether the page is using Server Components
   */
  "next.server_components"?: boolean;

  /**
   * Whether the request was cached
   */
  "next.cache_hit"?: boolean;

  /**
   * Runtime (nodejs, edge)
   */
  "next.runtime"?: "nodejs" | "edge";
}

/**
 * Standard semantic attribute keys for database operations.
 * @see {@link https://opentelemetry.io/docs/specs/semconv/database/}
 */
export interface DatabaseAttributes {
  /**
   * Database system (e.g., "postgresql", "mongodb", "redis")
   */
  "db.system": string;

  /**
   * Database operation (e.g., "SELECT", "INSERT", "UPDATE")
   */
  "db.operation": string;

  /**
   * Database name
   */
  "db.name"?: string;

  /**
   * Collection/table name
   */
  "db.collection"?: string;

  /**
   * Database statement (sanitized)
   */
  "db.statement"?: string;
}

/**
 * Standard semantic attribute keys for cache operations.
 */
export interface CacheAttributes {
  /**
   * Cache system (e.g., "redis", "memory", "nextjs")
   */
  "cache.system": string;

  /**
   * Cache operation (e.g., "get", "set", "delete")
   */
  "cache.operation": "get" | "set" | "delete" | "clear";

  /**
   * Cache hit or miss
   */
  "cache.hit": boolean;

  /**
   * Cache key (sanitized, low-cardinality)
   */
  "cache.key"?: string;
}

/**
 * Standard semantic attribute keys for authentication operations.
 */
export interface AuthAttributes {
  /**
   * Whether the user is authenticated
   */
  "user.authenticated": boolean;

  /**
   * User role (e.g., "admin", "user", "guest")
   */
  "user.role"?: string;

  /**
   * Authentication method (e.g., "clerk", "jwt", "session")
   */
  "auth.method"?: string;

  /**
   * Authentication provider (e.g., "clerk", "auth0")
   */
  "auth.provider"?: string;
}

/**
 * Standard semantic attribute keys for error tracking.
 */
export interface ErrorAttributes {
  /**
   * Error type/class name
   */
  "error.type": string;

  /**
   * Error message
   */
  "error.message": string;

  /**
   * Error stack trace (truncated)
   */
  "error.stack"?: string;

  /**
   * Whether the error was handled
   */
  "error.handled": boolean;
}

/**
 * Union type of all standard attribute interfaces for type-safe attribute setting.
 * @remarks
 * Use this for operations that require semantic attributes.
 * For custom attributes, use a record of string keys and string, number, or boolean values.
 */
export type SemanticAttributes = Partial<
  HttpAttributes & NextJsAttributes & DatabaseAttributes & CacheAttributes & AuthAttributes & ErrorAttributes
>;

/**
 * General attributes that can be attached to spans, events, and metrics.
 * @remarks
 * - Use `SemanticAttributes` for standard OpenTelemetry semantic conventions
 * - Use this type for custom attributes specific to your application
 * - Keep cardinality low to avoid metric explosion
 * - Avoid high-cardinality values (user IDs, timestamps, UUIDs) in metrics
 */
export type TelemetryAttributes = SemanticAttributes | Record<string, string | number | boolean>;

/**
 * Span creation options with type-safe attributes.
 */
export interface SpanOptions {
  /**
   * Span name following semantic conventions
   */
  name: SpanOperationType;

  /**
   * Attributes to set on span creation
   */
  attributes?: TelemetryAttributes;

  /**
   * Span kind (defaults to INTERNAL)
   */
  kind?: "internal" | "server" | "client" | "producer" | "consumer";
}

/**
 * Metric recording options with type-safe attributes.
 */
export interface MetricOptions {
  /**
   * Metric name following semantic conventions
   */
  name: MetricName;

  /**
   * Human-readable description
   */
  description?: string;

  /**
   * Metric unit (e.g., "ms", "bytes", "1")
   */
  unit?: string;
}

/**
 * Log entry structure for structured logging.
 */
export interface LogEntry {
  /**
   * ISO 8601 timestamp
   */
  timestamp: string;

  /**
   * Log level
   */
  level: LogLevel;

  /**
   * Human-readable message
   */
  message: string;

  /**
   * Trace ID for correlation (if within a span)
   */
  traceId?: string;

  /**
   * Span ID for correlation (if within a span)
   */
  spanId?: string;

  /**
   * Rendering context
   */
  context?: RenderContext;

  /**
   * Additional structured attributes
   */
  [key: string]: unknown;
}

// #endregion

// #region SDK Configuration

/**
 * OTLP endpoint for exporting telemetry data.
 *
 * Supports various backends:
 * - Local development: http://localhost:4318 (OpenTelemetry Collector)
 * - Azure Monitor: https://dc.services.visualstudio.com
 * - Jaeger: http://jaeger-collector:4318
 * - Custom OTLP receivers
 * @remarks
 * Set via `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable.
 * Falls back to localhost for local development.
 * @see {@link https://opentelemetry.io/docs/specs/otel/protocol/exporter/}
 */
const otlpEndpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4318";

/**
 * Azure Application Insights Connection String.
 *
 * Used to configure Azure Monitor exporters.
 * @remarks
 * Set via `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable.
 */
const connectionString = process.env["APPLICATIONINSIGHTS_CONNECTION_STRING"];
const {traceExporter, metricExporter} = connectionString
  ? (() => {
      console.log(">>> 📡 Using Azure Monitor exporters for OpenTelemetry");
      const credential = new DefaultAzureCredential({
        managedIdentityClientId: process.env["AZURE_CLIENT_ID"],
      });
      return {
        traceExporter: new AzureMonitorTraceExporter({
          connectionString,
          credential,
        }),
        metricExporter: new AzureMonitorMetricExporter({
          connectionString,
          credential,
        }),
      };
    })()
  : (() => {
      console.log(">>> 📡 Using OTLP HTTP exporters for OpenTelemetry at", otlpEndpoint);
      return {
        traceExporter: new OTLPTraceExporter({
          url: `${otlpEndpoint}/v1/traces`,
          headers: {},
        }),
        metricExporter: new OTLPMetricExporter({
          url: `${otlpEndpoint}/v1/metrics`,
          headers: {},
        }),
      };
    })();

/**
 * OpenTelemetry SDK instance.
 *
 * Configures and manages the telemetry pipeline including:
 * - Service identification
 * - Trace and metric exporters
 * - Automatic instrumentation for common libraries
 * - Span and metric processors
 * @remarks
 * - Metrics are exported every 60 seconds via periodic reader
 * - Traces are batched before export for efficiency
 * - File system instrumentation is disabled to reduce noise
 * - Auto-instrumentation covers HTTP, fetch, DNS, and other Node.js APIs
 * @see {@link https://opentelemetry.io/docs/languages/js/getting-started/nodejs/}
 */
const sdk = new NodeSDK({
  serviceName: "arolariu-website",
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60_000, // Export every 60 seconds
  }),
  spanProcessor: new BatchSpanProcessor(traceExporter),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable instrumentations that aren't needed or cause issues
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
});

// #endregion

// #region SDK Lifecycle Management

/**
 * Initializes and starts the OpenTelemetry SDK.
 *
 * This should be called early in the application lifecycle, typically in the
 * Next.js instrumentation hook (`instrumentation.ts`) before any other code runs.
 * @remarks
 * - Starts automatic instrumentation for HTTP, fetch, and other Node.js APIs
 * - Initializes trace and metric exporters
 * - Sets up periodic metric export (every 60 seconds)
 * - Configures batch span processing for efficiency
 * @throws {Error} Will log error to console if initialization fails
 * @example
 * // In instrumentation.ts
 * import { startTelemetry } from '@/lib/telemetry';
 *
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     startTelemetry();
 *   }
 * }
 * @see {@link https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation}
 */
export function startTelemetry(): void {
  try {
    sdk.start();
    console.log("📊 OpenTelemetry SDK started successfully");
  } catch (error) {
    console.error("❌ Failed to start OpenTelemetry SDK:", error);
  }
}

/**
 * Gracefully shuts down the OpenTelemetry SDK.
 *
 * Flushes any pending telemetry data and cleanly terminates exporters.
 * This ensures no data loss when the application terminates.
 * @remarks
 * - Flushes all pending spans and metrics
 * - Closes connections to OTLP endpoints
 * - Stops all instrumentation
 * - Should be called before process exit
 * @returns Promise that resolves when shutdown is complete
 * @throws {Error} Will log error to console if shutdown fails or times out
 * @example
 * // Manual shutdown
 * import { stopTelemetry } from '@/lib/telemetry';
 *
 * process.on('SIGTERM', async () => {
 *   await stopTelemetry();
 *   process.exit(0);
 * });
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/sdk/#shutdown}
 */
export async function stopTelemetry(): Promise<void> {
  try {
    await sdk.shutdown();
    console.log("📊 OpenTelemetry SDK shut down successfully");
  } catch (error) {
    console.error("❌ Failed to shut down OpenTelemetry SDK:", error);
  }
}

/**
 * Process signal handlers for graceful shutdown.
 *
 * Automatically registered when this module is imported.
 * Ensures telemetry data is flushed before process termination.
 * @remarks
 * Handles:
 * - SIGTERM: Graceful termination signal (e.g., from Docker, Kubernetes)
 * - SIGINT: Interrupt signal (e.g., Ctrl+C in terminal)
 */
// eslint-disable-next-line n/no-process-exit -- Required for graceful shutdown on SIGTERM
process.on("SIGTERM", async () => {
  await stopTelemetry();
  // eslint-disable-next-line n/no-process-exit -- Required for graceful shutdown on SIGTERM
  process.exit(0);
});

// eslint-disable-next-line n/no-process-exit -- Required for graceful shutdown on SIGINT
process.on("SIGINT", async () => {
  await stopTelemetry();
  // eslint-disable-next-line n/no-process-exit -- Required for graceful shutdown on SIGINT
  process.exit(0);
});

// #endregion

// #region Semantic Attribute Helpers

/**
 * Creates HTTP semantic attributes for server operations.
 * @param method The HTTP method (GET, POST, etc.)
 * @param statusCode The HTTP response status code
 * @param options Additional HTTP-related attributes
 * @returns Type-safe HTTP attributes
 * @example
 * const attrs = createHttpServerAttributes('GET', 200, {
 *   route: '/api/users/:id',
 *   target: '/api/users/123',
 * });
 */
export function createHttpServerAttributes(
  method: HttpMethod,
  statusCode: number,
  options?: {route?: string; target?: string; userAgent?: string; clientAddress?: string},
): HttpAttributes {
  return {
    "http.method": method,
    "http.status_code": statusCode,
    "http.route": options?.route,
    "http.target": options?.target,
    "http.user_agent": options?.userAgent,
    "client.address": options?.clientAddress,
  };
}

/**
 * Creates HTTP semantic attributes for client operations.
 * @param method The HTTP method being used
 * @param url The full URL being requested
 * @param statusCode The HTTP response status code (optional)
 * @returns Type-safe HTTP attributes
 * @example
 * const attrs = createHttpClientAttributes('POST', 'https://api.example.com/users', 201);
 */
export function createHttpClientAttributes(method: HttpMethod, url: string, statusCode?: number): Partial<HttpAttributes> {
  const attrs: Partial<HttpAttributes> = {
    "http.method": method,
    "http.url": url,
  };

  if (statusCode !== undefined) {
    attrs["http.status_code"] = statusCode;
  }

  return attrs;
}

/**
 * Create Next.js rendering semantic attributes.
 * @param renderContext Rendering context (server, client, edge, api)
 * @param options Additional Next.js attributes
 * @returns Type-safe Next.js attributes
 * @example
 * const attrs = createNextJsAttributes('server', {
 *   route: '/dashboard/[id]',
 *   pageType: 'dynamic',
 *   serverComponents: true,
 * });
 */
export function createNextJsAttributes(
  renderContext: RenderContext,
  options?: {
    route?: string;
    pageType?: "static" | "dynamic" | "isr";
    serverComponents?: boolean;
    cacheHit?: boolean;
    runtime?: "nodejs" | "edge";
  },
): NextJsAttributes {
  return {
    "next.render_context": renderContext,
    "next.route": options?.route,
    "next.page_type": options?.pageType,
    "next.server_components": options?.serverComponents,
    "next.cache_hit": options?.cacheHit,
    "next.runtime": options?.runtime,
  };
}

/**
 * Create database operation semantic attributes.
 * @param system Database system (postgresql, mongodb, redis, etc.)
 * @param operation Database operation (SELECT, INSERT, UPDATE, etc.)
 * @param options Additional database attributes
 * @returns Type-safe database attributes
 * @example
 * const attrs = createDatabaseAttributes('postgresql', 'SELECT', {
 *   name: 'production',
 *   collection: 'users',
 * });
 */
export function createDatabaseAttributes(
  system: string,
  operation: string,
  options?: {name?: string; collection?: string; statement?: string},
): DatabaseAttributes {
  return {
    "db.system": system,
    "db.operation": operation,
    "db.name": options?.name,
    "db.collection": options?.collection,
    "db.statement": options?.statement,
  };
}

/**
 * Create cache operation semantic attributes.
 * @param system Cache system (redis, memory, nextjs, etc.)
 * @param operation Cache operation (get, set, delete, clear)
 * @param hit Whether the operation was a cache hit
 * @param key Optional cache key (sanitized)
 * @returns Type-safe cache attributes
 * @example
 * const attrs = createCacheAttributes('redis', 'get', true, 'user:profile');
 */
export function createCacheAttributes(
  system: string,
  operation: "get" | "set" | "delete" | "clear",
  hit: boolean,
  key?: string,
): CacheAttributes {
  return {
    "cache.system": system,
    "cache.operation": operation,
    "cache.hit": hit,
    "cache.key": key,
  };
}

/**
 * Create authentication semantic attributes.
 * @param authenticated Whether the user is authenticated
 * @param options Additional auth attributes
 * @returns Type-safe authentication attributes
 * @example
 * const attrs = createAuthAttributes(true, {
 *   role: 'admin',
 *   method: 'clerk',
 *   provider: 'clerk',
 * });
 */
export function createAuthAttributes(
  authenticated: boolean,
  options?: {role?: string; method?: string; provider?: string},
): AuthAttributes {
  return {
    "user.authenticated": authenticated,
    "user.role": options?.role,
    "auth.method": options?.method,
    "auth.provider": options?.provider,
  };
}

/**
 * Create error semantic attributes from an error object.
 * @param error Error object or unknown value
 * @param handled Whether the error was handled
 * @returns Type-safe error attributes
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   const attrs = createErrorAttributes(error, true);
 *   logWithTrace('error', 'Operation failed', attrs);
 * }
 */
export function createErrorAttributes(error: Error | unknown, handled: boolean): ErrorAttributes {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  return {
    "error.type": errorObj.constructor.name,
    "error.message": errorObj.message,
    "error.stack": errorObj.stack?.slice(0, 500), // Truncate stack trace
    "error.handled": handled,
  };
}

// #endregion

// #region Tracer and Meter Access

/**
 * Get a tracer instance for creating spans.
 *
 * Tracers are used to create spans that represent units of work or operations.
 * Each tracer is identified by a name, typically matching the service or library name.
 * @param name Tracer name, typically the service or library name. Defaults to "arolariu-website"
 * @returns Tracer instance for creating spans
 * @remarks
 * - Tracer names should follow semantic conventions
 * - Use the same tracer name consistently within a module or service
 * - Tracer instances are cached by the OpenTelemetry API
 * @example
 * const tracer = getTracer('my-service');
 * const span = tracer.startSpan('operation.name');
 * // ... do work
 * span.end();
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#tracer}
 */
export function getTracer(name = "arolariu-website"): Tracer {
  return trace.getTracer(name);
}

/**
 * Get a meter instance for recording metrics.
 *
 * Meters are used to create metric instruments (counters, histograms, etc.)
 * that record quantitative measurements about application behavior.
 * @param name Meter name, typically the service or library name. Defaults to "arolariu-website"
 * @returns Meter instance for creating metric instruments
 * @remarks
 * - Meter names should follow semantic conventions
 * - Use the same meter name consistently within a module or service
 * - Meter instances are cached by the OpenTelemetry API
 * @example
 * const meter = getMeter('my-service');
 * const counter = meter.createCounter('requests.total');
 * counter.add(1, { method: 'GET' });
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/api/#meter}
 */
export function getMeter(name = "arolariu-website"): Meter {
  return metrics.getMeter(name);
}

// #endregion

// #region Span Utilities

/**
 * Executes a function within a traced span with automatic lifecycle management.
 *
 * This is the recommended way to create spans for async operations. It handles
 * span creation with context propagation, automatic success/error status setting,
 * exception recording, span cleanup, and end timing.
 * @template T Return type of the function
 * @param spanName Name of the span following semantic conventions (e.g., "http.server.request", "db.query")
 * @param fn Async function to execute within the span. Receives the span for adding attributes/events
 * @param attributes Optional type-safe attributes to set on span creation
 * @returns Promise resolving to the function's return value
 * @throws {Error} Re-throws any error from the function after recording it in the span
 * @remarks
 * - Span name must follow the `SpanOperationType` pattern for type safety
 * - Use dot notation for hierarchical naming (e.g., "http.client.request")
 * - Add high-cardinality data as events, not attributes
 * - The span is available in the callback for adding dynamic attributes
 * @example
 * // API route with HTTP attributes
 * const result = await withSpan('api.user.get', async (span) => {
 *   return await fetchUser(userId);
 * }, {
 *   'http.method': 'GET',
 *   'http.status_code': 200,
 *   'next.render_context': 'api',
 * });
 * @example
 * // Database operation with semantic attributes
 * const data = await withSpan(
 *   'db.query',
 *   async (span) => {
 *     span.addEvent('query.start');
 *     const result = await db.query(sql);
 *     span.addEvent('query.complete', { rows: result.length });
 *     return result;
 *   },
 *   {
 *     'db.system': 'postgresql',
 *     'db.operation': 'SELECT',
 *     'db.collection': 'users',
 *   }
 * );
 * @example
 * // Next.js Server Component rendering
 * const content = await withSpan('component.UserProfile', async (span) => {
 *   return await renderUserProfile();
 * }, {
 *   'next.render_context': 'server',
 *   'next.server_components': true,
 * });
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#span}
 * @see {@link https://opentelemetry.io/docs/specs/semconv/}
 */
export async function withSpan<T>(
  spanName: SpanOperationType,
  fn: (span: Span) => Promise<T>,
  attributes?: TelemetryAttributes,
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(spanName, {attributes});

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({code: SpanStatusCode.OK});
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add an event to the currently active span.
 *
 * Events represent discrete occurrences at a specific point in time during a span.
 * They're useful for recording timestamps of significant operations or milestones.
 * @param name Event name (e.g., "cache.hit", "validation.complete")
 * @param attributes Optional attributes providing event context
 * @remarks
 * - Events are timestamped automatically
 * - Use events for high-cardinality data (unlike span attributes)
 * - If no span is active, this is a no-op (safe to call)
 * - Events appear in trace visualization tools
 * @example
 * addSpanEvent('cache.hit', { cache_key: 'user:123' });
 * addSpanEvent('validation.start');
 * addSpanEvent('retry.attempt', { attempt: 2, delay_ms: 1000 });
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#add-events}
 */
export function addSpanEvent(name: string, attributes?: TelemetryAttributes): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.addEvent(name, attributes);
  }
}

/**
 * Set attributes on the currently active span.
 *
 * Attributes provide contextual information about the operation represented by the span.
 * They should be low-cardinality values suitable for grouping and filtering.
 * @param attributes Key-value pairs to attach to the span
 * @remarks
 * - Use semantic conventions where possible
 * - Avoid high-cardinality values (user IDs, timestamps, request IDs)
 * - Attributes can be used for filtering and grouping in observability tools
 * - If no span is active, this is a no-op (safe to call)
 * @example
 * setSpanAttributes({
 *   'http.method': 'POST',
 *   'http.status_code': 201,
 *   'user.authenticated': true,
 * });
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#set-attributes}
 * @see {@link https://opentelemetry.io/docs/specs/semconv/http/}
 */
export function setSpanAttributes(attributes: TelemetryAttributes): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.setAttributes(attributes);
  }
}

/**
 * Record an error on the currently active span.
 *
 * Marks the span as failed and records exception details for debugging.
 * This provides visibility into failures in distributed tracing tools.
 * @param error Error object or unknown value to record
 * @param message Optional custom error message. Defaults to error.message
 * @remarks
 * - Sets span status to ERROR
 * - Records exception with stack trace
 * - If no span is active, this is a no-op (safe to call)
 * - Error is not thrown by this function; handle that separately
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   recordSpanError(error, 'Failed to process user data');
 *   // Handle error...
 * }
 * @example
 * // In a span callback
 * await withSpan('process.data', async (span) => {
 *   try {
 *     return await processData();
 *   } catch (error) {
 *     recordSpanError(error); // Automatically uses active span
 *     throw error;
 *   }
 * });
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#record-exception}
 */
export function recordSpanError(error: Error | unknown, message?: string): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: message ?? (error instanceof Error ? error.message : "Unknown error"),
    });
    currentSpan.recordException(error as Error);
  }
}

// #endregion

// #region Metric Utilities

/**
 * Create a counter metric instrument.
 *
 * Counters are monotonically increasing values used to track totals.
 * They can only go up (or reset to zero). Use for counting events or operations.
 * @param name Metric name following semantic conventions (e.g., "http.server.requests")
 * @param description Human-readable description of what the metric measures
 * @param unit Optional unit of measurement (e.g., "1", "requests", "bytes")
 * @returns Counter instrument for recording values with type-safe attributes
 * @remarks
 * - Counter values should only increase
 * - Use add() with positive values only
 * - Include units in the name (e.g., "requests", "bytes", "errors")
 * - Keep attribute cardinality low to avoid metric explosion
 * - Counters are aggregated as sums in backends
 * @example
 * const requestCounter = createCounter(
 *   'http.server.requests',
 *   'Total number of HTTP requests received',
 *   '1'
 * );
 *
 * // Record a request with type-safe attributes
 * requestCounter.add(1, {
 *   'http.method': 'GET',
 *   'http.status_code': 200,
 *   'next.render_context': 'api',
 * });
 * @example
 * // User action counter
 * const userActionCounter = createCounter('user.actions', 'Total user actions');
 * userActionCounter.add(1, {
 *   'user.authenticated': true,
 *   'user.role': 'admin',
 * });
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/api/#counter}
 * @see {@link https://opentelemetry.io/docs/specs/semconv/general/metrics/}
 */
export function createCounter(name: MetricName, description?: string, unit?: string) {
  const meter = getMeter();
  return meter.createCounter(name, {description, unit});
}

/**
 * Create a histogram metric instrument.
 *
 * Histograms record distributions of values (e.g., latency, request size).
 * They track count, sum, min, max, and bucketed distributions.
 * @param name Metric name following semantic conventions (e.g., "http.server.duration")
 * @param description Human-readable description of what the metric measures
 * @param unit Optional unit of measurement (e.g., "ms", "bytes", "s")
 * @returns Histogram instrument for recording values with type-safe attributes
 * @remarks
 * - Use for measurements that vary over time
 * - Ideal for latency, duration, size metrics
 * - Backends typically aggregate as percentiles (p50, p95, p99)
 * - Include units in the name (e.g., "duration.ms", "size.bytes")
 * - Values can be any non-negative number
 * @example
 * const durationHistogram = createHistogram(
 *   'http.server.duration',
 *   'HTTP request duration in milliseconds',
 *   'ms'
 * );
 *
 * const startTime = Date.now();
 * // ... handle request
 * const duration = Date.now() - startTime;
 *
 * durationHistogram.record(duration, {
 *   'http.method': 'POST',
 *   'http.route': '/api/users',
 *   'http.status_code': 201,
 * });
 * @example
 * // Page load time histogram
 * const pageLoadHistogram = createHistogram(
 *   'page.load.duration',
 *   'Page load duration in milliseconds',
 *   'ms'
 * );
 * pageLoadHistogram.record(loadTime, {
 *   'next.render_context': 'server',
 *   'next.page_type': 'dynamic',
 * });
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/api/#histogram}
 * @see {@link https://opentelemetry.io/docs/specs/semconv/http/http-metrics/}
 */
export function createHistogram(name: MetricName, description?: string, unit?: string) {
  const meter = getMeter();
  return meter.createHistogram(name, {description, unit});
}

/**
 * Create an up-down counter metric instrument.
 *
 * Up-down counters track values that can increase or decrease.
 * Use for gauges like active connections, queue depth, or resource utilization.
 * @param name Metric name following semantic conventions (e.g., "http.server.active_requests")
 * @param description Human-readable description of what the metric measures
 * @param unit Optional unit of measurement (e.g., "1", "connections", "bytes")
 * @returns UpDownCounter instrument for recording values with type-safe attributes
 * @remarks
 * - Values can increase or decrease (unlike regular counters)
 * - Use add() with positive or negative values
 * - Ideal for tracking current state or active resources
 * - Backends typically report the current sum
 * - Not suitable for rates or totals (use counter instead)
 * @example
 * const activeConnections = createUpDownCounter(
 *   'http.server.active_requests',
 *   'Number of active HTTP requests being processed',
 *   '1'
 * );
 *
 * // Request starts
 * activeConnections.add(1, {
 *   'http.method': 'GET',
 *   'next.render_context': 'api',
 * });
 *
 * // ... process request
 *
 * // Request completes
 * activeConnections.add(-1, {
 *   'http.method': 'GET',
 *   'next.render_context': 'api',
 * });
 * @example
 * // Cache size tracking
 * const cacheSize = createUpDownCounter('cache.size.bytes', 'Current cache size in bytes', 'bytes');
 * cacheSize.add(1024, { 'cache.system': 'redis' }); // Item cached
 * cacheSize.add(-1024, { 'cache.system': 'redis' }); // Item evicted
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/api/#updowncounter}
 */
export function createUpDownCounter(name: MetricName, description?: string, unit?: string) {
  const meter = getMeter();
  return meter.createUpDownCounter(name, {description, unit});
}

// #endregion

// #region Logging Utilities

/**
 * Emit structured logs correlated with distributed traces.
 *
 * Provides JSON-formatted logging with automatic trace context injection.
 * This enables correlation between logs and traces in observability platforms.
 * @param level Log level (debug, info, warn, error)
 * @param message Human-readable log message
 * @param attributes Additional structured data to include in the log entry
 * @param context Optional rendering context (server, client, edge, api)
 * @remarks
 * - Automatically includes trace ID and span ID when within an active span
 * - Outputs JSON to stdout/stderr for structured log ingestion
 * - Timestamps are ISO 8601 formatted
 * - Use attributes for structured data instead of string interpolation
 * - Logs are written to appropriate console stream based on level
 * - Debug logs are only emitted in development mode
 * @example
 * // Basic logging with context
 * logWithTrace('info', 'User logged in', {
 *   'user.authenticated': true,
 *   'auth.method': 'clerk',
 * }, 'api');
 * @example
 * // API route logging
 * await withSpan('api.user.create', async (span) => {
 *   logWithTrace('info', 'Creating user', {
 *     'http.method': 'POST',
 *     'http.route': '/api/users',
 *   }, 'api');
 *
 *   try {
 *     const user = await createUser(data);
 *     logWithTrace('info', 'User created successfully', {
 *       userId: user.id,
 *     }, 'api');
 *   } catch (error) {
 *     logWithTrace('error', 'Failed to create user', {
 *       'error.type': error.constructor.name,
 *       'error.message': error.message,
 *       'error.handled': true,
 *     }, 'api');
 *   }
 * });
 * @example
 * // Server component logging
 * logWithTrace('debug', 'Rendering user profile', {
 *   'next.render_context': 'server',
 *   'next.server_components': true,
 * }, 'server');
 * @example
 * // Output format
 * {
 *   "timestamp": "2025-10-11T14:30:00.123Z",
 *   "level": "info",
 *   "message": "User logged in",
 *   "traceId": "1234567890abcdef",
 *   "spanId": "fedcba0987654321",
 *   "context": "api",
 *   "user.authenticated": true,
 *   "auth.method": "clerk"
 * }
 * @see {@link https://opentelemetry.io/docs/specs/otel/logs/}
 * @see {@link https://www.w3.org/TR/trace-context/}
 */
export function logWithTrace(level: LogLevel, message: string, attributes?: Record<string, unknown>, context?: RenderContext): void {
  // Skip debug logs in production
  if (level === "debug" && process.env["NODE_ENV"] === "production") {
    return;
  }

  const currentSpan = trace.getActiveSpan();
  const spanContext = currentSpan?.spanContext();

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId,
    context,
    ...attributes,
  };

  switch (level) {
    case "error":
      console.error(JSON.stringify(logEntry));
      break;
    case "warn":
      console.warn(JSON.stringify(logEntry));
      break;
    case "debug":
      console.debug(JSON.stringify(logEntry));
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

// #endregion
