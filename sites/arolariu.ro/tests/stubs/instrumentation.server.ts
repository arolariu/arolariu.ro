/**
 * @fileoverview Stub for `@/instrumentation.server` in Vitest tests.
 * @module tests/stubs/instrumentation.server
 *
 * @remarks
 * The real module imports heavy OpenTelemetry SDKs and Azure Monitor exporters
 * that crash in happy-dom. This stub provides no-op implementations using `vi.fn()`
 * with stable original implementations that survive `restoreMocks: true`.
 *
 * **Pattern**: `vi.fn(impl)` sets `impl` as the "original" implementation.
 * `mockRestore()` reverts to this original — so stubs are always stable.
 *
 * Tests that need to assert on these functions can use `vi.mocked()`:
 * ```ts
 * import {withSpan} from "@/instrumentation.server";
 * const mockWithSpan = vi.mocked(withSpan);
 * expect(mockWithSpan).toHaveBeenCalledWith("span.name", expect.any(Function));
 * ```
 */

import {vi} from "vitest";

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

export const startTelemetry = vi.fn();
export const stopTelemetry = vi.fn(async () => {});

// #endregion

// #region Context propagation

export const injectTraceContextHeaders = vi.fn((headers?: Headers) => {
  const enrichedHeaders = headers instanceof Headers ? headers : new Headers();
  enrichedHeaders.set("traceparent", "00-test-trace-id");
  return enrichedHeaders;
});

export const getTraceparentHeader = vi.fn(() => "");

// #endregion

// #region Attribute factories (return empty objects)

export const createHttpServerAttributes = vi.fn(() => ({}));
export const createHttpClientAttributes = vi.fn(() => ({}));
export const createNextJsAttributes = vi.fn(() => ({}));
export const createDatabaseAttributes = vi.fn(() => ({}));
export const createCacheAttributes = vi.fn(() => ({}));
export const createAuthAttributes = vi.fn(() => ({}));
export const createErrorAttributes = vi.fn(() => ({}));

// #endregion

// #region Tracer & Meter factories

const noopSpan = {setAttribute: vi.fn(), addEvent: vi.fn(), end: vi.fn(), setStatus: vi.fn(), recordException: vi.fn()};
const noopTracer = {startSpan: vi.fn(() => noopSpan), startActiveSpan: vi.fn()};
const noopCounter = {add: vi.fn()};
const noopHistogram = {record: vi.fn()};

export const getTracer = vi.fn(() => noopTracer);
export const getMeter = vi.fn(() => ({createCounter: vi.fn(() => noopCounter), createHistogram: vi.fn(() => noopHistogram)}));

// #endregion

// #region Span operations

/** Passthrough: executes `fn` immediately and returns its result. */
export const withSpan = vi.fn((_name: string, fn: () => Promise<unknown>) => fn());
export const addSpanEvent = vi.fn();
export const setSpanAttributes = vi.fn();
export const recordSpanError = vi.fn();

// #endregion

// #region Metrics

export const createCounter = vi.fn(() => noopCounter);
export const createHistogram = vi.fn(() => noopHistogram);
export const createUpDownCounter = vi.fn(() => noopCounter);

// #endregion

// #region Logging

export const logWithTrace = vi.fn();

// #endregion
