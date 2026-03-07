/**
 * @fileoverview Unit tests for server-side single-key config cache.
 * @module sites/arolariu.ro/src/lib/config/configCatalogCache.server.test
 */

import {describe, expect, it} from "vitest";

import {getCachedConfigValue, invalidateConfigValueCache, setCachedConfigValue} from "./configCatalogCache.server";

const samplePayload = {
  name: "Endpoints:Api",
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
    setCachedConfigValue("Endpoints:Api", samplePayload);

    expect(getCachedConfigValue("Endpoints:Api")).toEqual(samplePayload);
  });

  it("returns null for missing entries", () => {
    invalidateConfigValueCache();
    expect(getCachedConfigValue("Endpoints:Api")).toBeNull();
  });

  it("returns null for stale entries", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Api", {...samplePayload, refreshIntervalSeconds: 0});

    expect(getCachedConfigValue("Endpoints:Api")).toBeNull();
  });

  it("invalidates by key and globally", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Api", samplePayload);
    setCachedConfigValue("Common:Auth:Secret", {...samplePayload, name: "Common:Auth:Secret"});

    invalidateConfigValueCache("Endpoints:Api");
    expect(getCachedConfigValue("Endpoints:Api")).toBeNull();
    expect(getCachedConfigValue("Common:Auth:Secret")?.name).toBe("Common:Auth:Secret");

    invalidateConfigValueCache();
    expect(getCachedConfigValue("Common:Auth:Secret")).toBeNull();
  });
});
