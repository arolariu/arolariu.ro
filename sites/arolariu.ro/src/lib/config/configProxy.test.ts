/**
 * @fileoverview Unit tests for single-key exp config proxy behavior.
 * @module sites/arolariu.ro/src/lib/config/configProxy.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {getCachedConfigValue, invalidateConfigValueCache, isConfigValueResponse, setCachedConfigValue} from "./configProxy";

const instrumentationMocks = vi.hoisted(() => ({
  injectTraceContextHeaders: vi.fn((headers?: Headers) => {
    const enrichedHeaders = headers instanceof Headers ? headers : new Headers();
    enrichedHeaders.set("traceparent", "00-abcdefabcdefabcdefabcdefabcdefab-abcdefabcdefabcd-01");
    enrichedHeaders.set("X-Request-Id", "abcdefabcdefabcdefabcdefabcdefab");
    return enrichedHeaders;
  }),
}));

// Mock instrumentation — configProxy.ts imports {addSpanEvent, logWithTrace, withSpan}
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name: string, fn: () => unknown) => fn()),
  logWithTrace: vi.fn(),
  addSpanEvent: vi.fn(),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: instrumentationMocks.injectTraceContextHeaders,
}));

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function createConfigValuePayload(name: string, value: string, refreshIntervalSeconds = 300) {
  return {
    name,
    value,
    availableForTargets: ["website"],
    availableInDocuments: ["website.build-time", "website.run-time"],
    description: `${name} description`,
    fetchedAt: "2026-01-01T00:00:00Z",
    refreshIntervalSeconds,
    requiredInDocuments: ["website.build-time", "website.run-time"],
    usage: `${name} usage`,
  } as const;
}

describe("configProxy", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env["AZURE_CLIENT_ID"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
  });

  it("fetches one config value and returns the resolved value", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Storage:Blob", "https://storage.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Endpoints:Storage:Blob");

    expect(value).toBe("https://storage.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("/api/v1/config?name=Endpoints%3AStorage%3ABlob");
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).toMatchObject({
      "X-Exp-Target": "website",
      "X-Request-Id": "abcdefabcdefabcdefabcdefabcdefab",
      traceparent: "00-abcdefabcdefabcdefabcdefabcdefab-abcdefabcdefabcd-01",
    });
  });

  it("returns cached values without an additional network call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const first = await fetchConfigValue("Auth:JWT:Issuer");
    const second = await fetchConfigValue("Auth:JWT:Issuer");

    expect(first).toBe("https://issuer.example.test");
    expect(second).toBe("https://issuer.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when exp rejects an unknown key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "Unknown"}, 400)));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await expect(fetchConfigValue("Unknown:Key")).rejects.toThrow("Failed to fetch config 'Unknown:Key' (status=400).");
  });

  it("returns an empty string for optional keys with empty values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Communication:Email:ApiKey", ""))));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Communication:Email:ApiKey");

    expect(value).toBe("");
  });

  it("fetches multiple values independently and returns them as a record", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Secret", "super-secret")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const values = await fetchConfigValues(["Auth:JWT:Issuer", "Auth:JWT:Secret"]);

    expect(values["Auth:JWT:Issuer"]).toBe("https://issuer.example.test");
    expect(values["Auth:JWT:Secret"]).toBe("super-secret");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached keys so the next read refetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://updated.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const first = await fetchConfigValue("Auth:JWT:Issuer");
    invalidateConfigCache("Auth:JWT:Issuer");
    const second = await fetchConfigValue("Auth:JWT:Issuer");

    expect(first).toBe("https://issuer.example.test");
    expect(second).toBe("https://updated.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses http://exp when AZURE_CLIENT_ID is not set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await fetchConfigValue("Endpoints:Service:Api");

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("http://exp");
  });

  it("uses https://exp.arolariu.ro when AZURE_CLIENT_ID is set", async () => {
    process.env["AZURE_CLIENT_ID"] = "test-managed-identity-id";
    vi.resetModules();

    vi.doMock("@/lib/azure/credentials", () => ({
      getAzureCredential: () => ({
        getToken: vi.fn().mockResolvedValue({token: "mock-azure-bearer-token"}),
      }),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await fetchConfigValue("Endpoints:Service:Api");

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("https://exp.arolariu.ro");
  });

  it("throws when exp returns OK but payload is invalid (non-config shape)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({unexpected: "shape"})));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await expect(fetchConfigValue("Some:Key")).rejects.toThrow("Invalid config response payload for key 'Some:Key'.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Typed config value helpers (with env-var fallback)
// ─────────────────────────────────────────────────────────────────────────────

describe("configProxy typed helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
    delete process.env["API_URL"];
    delete process.env["API_JWT"];
    delete process.env["RESEND_API_KEY"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
    delete process.env["API_URL"];
    delete process.env["API_JWT"];
    delete process.env["RESEND_API_KEY"];
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchApiUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchApiUrl", () => {
    it("returns the value from exp when available", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.arolariu.ro"))),
      );

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("https://api.arolariu.ro");
    });

    it("falls back to API_URL env var when exp returns empty", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", ""))));
      process.env["API_URL"] = "https://api-fallback.example.com";

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("https://api-fallback.example.com");
    });

    it("falls back to API_URL env var when exp throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));
      process.env["API_URL"] = "https://api-env.example.com";

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("https://api-env.example.com");
    });

    it("returns empty string when both exp and env are absent", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchApiJwtSecret
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchApiJwtSecret", () => {
    it("returns the value from exp when available", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Secret", "super-secret-from-exp"))),
      );

      const {fetchApiJwtSecret, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiJwtSecret();

      expect(result).toBe("super-secret-from-exp");
    });

    it("falls back to API_JWT env var when exp throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));
      process.env["API_JWT"] = "env-jwt-fallback";

      const {fetchApiJwtSecret, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiJwtSecret();

      expect(result).toBe("env-jwt-fallback");
    });

    it("returns empty string when both exp and env are absent", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));

      const {fetchApiJwtSecret, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiJwtSecret();

      expect(result).toBe("");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchResendApiKey
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchResendApiKey", () => {
    it("returns the value from exp when available", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Communication:Email:ApiKey", "re_exp_key_value"))),
      );

      const {fetchResendApiKey, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchResendApiKey();

      expect(result).toBe("re_exp_key_value");
    });

    it("falls back to RESEND_API_KEY env var when exp throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));
      process.env["RESEND_API_KEY"] = "re_env_key";

      const {fetchResendApiKey, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchResendApiKey();

      expect(result).toBe("re_env_key");
    });

    it("returns empty string when both exp and env are absent", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));

      const {fetchResendApiKey, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchResendApiKey();

      expect(result).toBe("");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isConfigValueResponse guard (consolidated from configCatalog.types.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe("isConfigValueResponse", () => {
  it("returns true for a valid single-key config payload", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoints:Service:Api",
        value: "https://api.example.test",
        availableForTargets: ["website"],
        availableInDocuments: ["website.build-time", "website.run-time"],
        requiredInDocuments: ["website.build-time", "website.run-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: 300,
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("returns false for null and non-object payloads", () => {
    expect(isConfigValueResponse(null)).toBe(false);
    expect(isConfigValueResponse("invalid")).toBe(false);
  });

  it("returns false when array metadata contains non-string values", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoints:Service:Api",
        value: "https://api.example.test",
        availableForTargets: [42],
        availableInDocuments: ["website.build-time"],
        requiredInDocuments: ["website.build-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: 300,
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("returns false when refresh interval is not numeric", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoints:Service:Api",
        value: "https://api.example.test",
        availableForTargets: ["website"],
        availableInDocuments: ["website.build-time"],
        requiredInDocuments: ["website.build-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: "300",
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Config cache (consolidated from configCatalogCache.server.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

const samplePayload = {
  name: "Endpoints:Service:Api",
  value: "https://api.example.test",
  availableForTargets: ["website"],
  availableInDocuments: ["website.build-time", "website.run-time"],
  requiredInDocuments: ["website.build-time", "website.run-time"],
  description: "API endpoint.",
  usage: "Server-only.",
  refreshIntervalSeconds: 300,
  fetchedAt: "2026-01-01T00:00:00Z",
} as const;

describe("configCatalogCache.server", () => {
  it("stores and retrieves a config value entry", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Service:Api", samplePayload);

    expect(getCachedConfigValue("Endpoints:Service:Api")).toEqual(samplePayload);
  });

  it("returns null for missing entries", () => {
    invalidateConfigValueCache();
    expect(getCachedConfigValue("Endpoints:Service:Api")).toBeNull();
  });

  it("returns null for stale entries", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Service:Api", {...samplePayload, refreshIntervalSeconds: 0});

    expect(getCachedConfigValue("Endpoints:Service:Api")).toBeNull();
  });

  it("invalidates by key and globally", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Service:Api", samplePayload);
    setCachedConfigValue("Auth:JWT:Secret", {...samplePayload, name: "Auth:JWT:Secret"});

    invalidateConfigValueCache("Endpoints:Service:Api");
    expect(getCachedConfigValue("Endpoints:Service:Api")).toBeNull();
    expect(getCachedConfigValue("Auth:JWT:Secret")?.name).toBe("Auth:JWT:Secret");

    invalidateConfigValueCache();
    expect(getCachedConfigValue("Auth:JWT:Secret")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker and stale cache tests
// ─────────────────────────────────────────────────────────────────────────────

describe("configProxy circuit breaker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should trip circuit breaker on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Network error")));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await expect(fetchConfigValue("Test:Key")).rejects.toThrow();
  });

  it("should return stale cached value when circuit is open", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Test:Key", "cached-value", 0)))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Test:Key", "new-value")));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    // First call: cache the value
    const first = await fetchConfigValue("Test:Key");
    expect(first).toBe("cached-value");

    // Wait for cache to become stale (TTL = 0)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second call: should fail and trip circuit breaker
    await expect(fetchConfigValue("Test:Key")).rejects.toThrow();

    // Third call: circuit is open, should return stale cache
    const third = await fetchConfigValue("Test:Key");
    expect(third).toBe("cached-value");
  });

  it("should throw when circuit is open and no stale cache exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    // First call trips circuit
    await expect(fetchConfigValue("New:Key")).rejects.toThrow();

    // Second call: circuit is open, no stale cache
    await expect(fetchConfigValue("New:Key")).rejects.toThrow("exp circuit breaker open");
  });
});
