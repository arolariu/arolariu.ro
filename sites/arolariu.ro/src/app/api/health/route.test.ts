/**
 * @fileoverview Unit tests for the /api/health route handler.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const instrumentationMocks = vi.hoisted(() => ({
  injectTraceContextHeaders: vi.fn((headers?: Headers) => {
    const enrichedHeaders = headers instanceof Headers ? headers : new Headers();
    enrichedHeaders.set("traceparent", "00-feedfacefeedfacefeedfacefeedface-feedfacefeedface-01");
    enrichedHeaders.set("X-Request-Id", "feedfacefeedfacefeedfacefeedface");
    return enrichedHeaders;
  }),
}));

// Mock server-only and OTel before any imports
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name: string, fn: () => unknown) => fn()),
  addSpanEvent: vi.fn(),
  setSpanAttributes: vi.fn(),
  logWithTrace: vi.fn(),
  createHistogram: vi.fn(() => ({record: vi.fn()})),
  createCounter: vi.fn(() => ({add: vi.fn()})),
  createHttpServerAttributes: vi.fn(() => ({})),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: instrumentationMocks.injectTraceContextHeaders,
}));

vi.mock("next/package.json", () => ({version: "16.1.6"}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("/api/health", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubEnv("SITE_ENV", "DEVELOPMENT");
    vi.stubEnv("COMMIT_SHA", "abc123def456");
    vi.stubEnv("SITE_NAME", "dev.arolariu.ro");
    vi.stubEnv("SITE_URL", "https://dev.arolariu.ro");
    vi.stubEnv("INFRA", "local");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns Healthy when all dependencies are reachable", async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("Healthy");
    expect(body.dependencies).toHaveLength(2);
    expect(body.dependencies[0]?.status).toBe("Healthy");
    expect(body.dependencies[1]?.status).toBe("Healthy");
    expect(body.dependencies[0]?.latencyMs).toBeTypeOf("number");
    expect(body.dependencies[1]?.latencyMs).toBeTypeOf("number");
    const [, firstOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = firstOptions.headers as Headers;
    expect(headers.get("traceparent")).toBe("00-feedfacefeedfacefeedfacefeedface-feedfacefeedface-01");
    expect(headers.get("X-Request-Id")).toBe("feedfacefeedfacefeedfacefeedface");
  });

  it("returns Degraded when a dependency returns non-OK status", async () => {
    mockFetch
      .mockResolvedValueOnce({ok: true, status: 200}) // exp
      .mockResolvedValueOnce({ok: false, status: 503}); // api

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("Degraded");
    expect(body.dependencies[1]?.status).toBe("Degraded");
    expect(body.dependencies[1]?.statusCode).toBe(503);
  });

  it("returns Unhealthy when a dependency throws", async () => {
    mockFetch
      .mockResolvedValueOnce({ok: true, status: 200}) // exp
      .mockRejectedValueOnce(new Error("Connection refused")); // api

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("Unhealthy");
    expect(body.dependencies[1]?.status).toBe("Unhealthy");
    expect(body.dependencies[1]?.error).toBe("Connection refused");
  });

  it("returns Unhealthy when all dependencies are down", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("Unhealthy");
    expect(body.dependencies[0]?.status).toBe("Unhealthy");
    expect(body.dependencies[1]?.status).toBe("Unhealthy");
  });

  it("includes process metadata in the response", async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.process).toBeDefined();
    expect(body.process.uptimeSeconds).toBeTypeOf("number");
    expect(body.process.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.process.nodeVersion).toMatch(/^v\d+/);
    expect(body.process.nextVersion).toBe("16.1.6");
    expect(body.process.platform).toBeTypeOf("string");
    expect(body.process.arch).toBeTypeOf("string");
    expect(body.process.memoryUsageMB.rss).toBeTypeOf("number");
    expect(body.process.memoryUsageMB.heapUsed).toBeTypeOf("number");
    expect(body.process.memoryUsageMB.heapTotal).toBeTypeOf("number");
  });

  it("includes build metadata in the response", async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.build).toBeDefined();
    expect(body.build.commitSha).toBe("abc123def456");
    expect(body.build.environment).toBe("DEVELOPMENT");
    expect(body.build.siteName).toBe("dev.arolariu.ro");
    expect(body.build.siteUrl).toBe("https://dev.arolariu.ro");
    expect(body.build.infraMode).toBe("local");
  });

  it("includes check duration and timestamp", async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.checkDurationMs).toBeTypeOf("number");
    expect(body.checkDurationMs).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes dependency names and URLs", async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.dependencies[0]?.name).toContain("exp");
    expect(body.dependencies[1]?.name).toContain("api");
    expect(body.dependencies[0]?.url).toContain("/api/health");
    expect(body.dependencies[1]?.url).toContain("/health");
  });

  it("handles non-Error thrown values gracefully", async () => {
    mockFetch.mockResolvedValueOnce({ok: true, status: 200}).mockRejectedValueOnce("string error");

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.dependencies[1]?.status).toBe("Unhealthy");
    expect(body.dependencies[1]?.error).toBe("string error");
  });

  it("uses fallback values when env vars are missing", async () => {
    vi.stubEnv("COMMIT_SHA", "");
    vi.stubEnv("SITE_ENV", "");
    vi.stubEnv("SITE_NAME", "");
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("INFRA", "");
    // Delete the env vars so ?? fallback triggers
    delete process.env["COMMIT_SHA"];
    delete process.env["SITE_ENV"];
    delete process.env["SITE_NAME"];
    delete process.env["SITE_URL"];
    delete process.env["INFRA"];
    mockFetch.mockResolvedValue({ok: true, status: 200});

    const {GET} = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.build.commitSha).toBe("unknown");
    expect(body.build.environment).toBe("unknown");
    expect(body.build.siteName).toBe("unknown");
    expect(body.build.siteUrl).toBe("unknown");
    expect(body.build.infraMode).toBe("unknown");
  });
});
