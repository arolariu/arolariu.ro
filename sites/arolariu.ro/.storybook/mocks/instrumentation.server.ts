/**
 * @fileoverview Browser-safe stub for `@/instrumentation.server` in Storybook.
 * @module .storybook/mocks/instrumentation.server
 *
 * @remarks
 * **Root cause**: `@/instrumentation.server` imports Node-only OpenTelemetry
 * SDKs (`@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`,
 * `@azure/monitor-opentelemetry-exporter`, `@azure/identity`, etc.). Any
 * Client Component that transitively imports a `"use server"` action which in
 * turn imports `@/instrumentation.server` (directly, or via `@/lib/utils.server`
 * / `@/lib/config/configProxy`) pulls that entire Node SDK graph into the
 * Storybook browser bundle, because `@storybook/nextjs-vite` does not perform
 * the real Next.js `"use server"` RPC-boundary transform — it bundles the
 * server action module as plain client-side JS. One of those bundled CJS
 * dependencies references the Node-only `__dirname` global at module scope,
 * which throws `ReferenceError: __dirname is not defined` in the browser.
 *
 * This stub provides no-op / passthrough implementations of the module's
 * public API so components can render in Storybook without bundling any
 * telemetry SDK. Aliased in `.storybook/main.ts` (`viteFinal`) — the alias
 * MUST be an exact-specifier match on `@/instrumentation.server` so it takes
 * priority over the generic `@/*` tsconfig-paths mapping.
 *
 * Mirrors the equivalent Vitest stub at `tests/stubs/instrumentation.server.ts`,
 * without a `vitest` dependency (this file is bundled for the browser, not
 * executed by the Vitest test runner).
 */

// #region Type re-exports (no runtime cost — just types)

export type LogLevel = "debug" | "info" | "warn" | "error";
export type RenderContext = "server" | "client" | "edge" | "api";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type HttpStatusCategory = "success" | "redirect" | "client_error" | "server_error";

export type SpanOperationType =
  | "http.request"
  | "http.server"
  | "db.query"
  | "cache.operation"
  | "auth.operation"
  | "render.operation"
  | "middleware.operation"
  | "api.route"
  | "server.action"
  | "custom";

export type MetricName =
  | "http.requests.total"
  | "http.request.duration"
  | "http.errors.total"
  | "cache.hits"
  | "cache.misses"
  | "auth.attempts"
  | "auth.failures"
  | "render.duration"
  | "api.calls.total"
  | "custom";

export type TelemetryAttributes = Record<string, string | number | boolean>;
export type SemanticAttributes = Record<string, string | number | boolean>;

// #endregion

// #region Lifecycle

export function startTelemetry(): void {
  // No-op in Storybook — there is no server runtime to instrument.
}

export async function stopTelemetry(): Promise<void> {
  // No-op in Storybook.
}

// #endregion

// #region Context propagation

export function injectTraceContextHeaders(headers?: Headers): Headers {
  return headers instanceof Headers ? headers : new Headers();
}

export function getTraceparentHeader(): string {
  return "";
}

// #endregion

// #region Attribute factories (return empty objects)

export function createHttpServerAttributes(): TelemetryAttributes {
  return {};
}

export function createHttpClientAttributes(): TelemetryAttributes {
  return {};
}

export function createNextJsAttributes(): TelemetryAttributes {
  return {};
}

export function createDatabaseAttributes(): TelemetryAttributes {
  return {};
}

export function createCacheAttributes(): TelemetryAttributes {
  return {};
}

export function createAuthAttributes(): TelemetryAttributes {
  return {};
}

export function createErrorAttributes(): TelemetryAttributes {
  return {};
}

// #endregion

// #region Tracer & Meter factories

const noopSpan = {
  setAttribute: () => undefined,
  setAttributes: () => undefined,
  addEvent: () => undefined,
  end: () => undefined,
  setStatus: () => undefined,
  recordException: () => undefined,
};
const noopTracer = {startSpan: () => noopSpan, startActiveSpan: () => undefined};
const noopCounter = {add: () => undefined};
const noopHistogram = {record: () => undefined};

export function getTracer() {
  return noopTracer;
}

export function getMeter() {
  return {
    createCounter: () => noopCounter,
    createHistogram: () => noopHistogram,
  };
}

// #endregion

// #region Span operations

/** Passthrough: executes `fn` immediately (with a no-op span) and returns its result. */
export async function withSpan<T>(_name: string, fn: (span: typeof noopSpan) => Promise<T>): Promise<T> {
  return fn(noopSpan);
}

export function addSpanEvent(): void {
  // No-op in Storybook.
}

export function setSpanAttributes(): void {
  // No-op in Storybook.
}

export function recordSpanError(): void {
  // No-op in Storybook.
}

// #endregion

// #region Metrics

export function createCounter() {
  return noopCounter;
}

export function createHistogram() {
  return noopHistogram;
}

export function createUpDownCounter() {
  return noopCounter;
}

// #endregion

// #region Logging

export function logWithTrace(): void {
  // No-op in Storybook.
}

// #endregion
