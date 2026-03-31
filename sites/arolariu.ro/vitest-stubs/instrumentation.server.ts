/**
 * @fileoverview Stub for instrumentation.server in Vitest tests.
 * @module vitest-stubs/instrumentation.server
 */

import {vi} from "vitest";

export const withSpan = vi.fn((_name: string, fn: () => Promise<unknown>) => fn());
export const addSpanEvent = vi.fn();
export const logWithTrace = vi.fn();
export const getTraceparentHeader = vi.fn(() => "");
export const recordSpanError = vi.fn();
export const injectTraceContextHeaders = vi.fn((headers?: Headers) => {
  const enrichedHeaders = headers instanceof Headers ? headers : new Headers();
  enrichedHeaders.set("traceparent", "00-test-trace-id");
  return enrichedHeaders;
});
