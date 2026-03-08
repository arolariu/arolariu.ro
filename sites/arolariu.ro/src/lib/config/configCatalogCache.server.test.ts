/**
 * @fileoverview Unit tests for server-side single-key config cache.
 * @module sites/arolariu.ro/src/lib/config/configCatalogCache.server.test
 */

import {describe, expect, it} from "vitest";

import {getCachedConfigValue, invalidateConfigValueCache, setCachedConfigValue} from "./configCatalogCache.server";

const samplePayload = {
  name: "Endpoint:Service:Api",
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
    setCachedConfigValue("Endpoint:Service:Api", samplePayload);

    expect(getCachedConfigValue("Endpoint:Service:Api")).toEqual(samplePayload);
  });

  it("returns null for missing entries", () => {
    invalidateConfigValueCache();
    expect(getCachedConfigValue("Endpoint:Service:Api")).toBeNull();
  });

  it("returns null for stale entries", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoint:Service:Api", {...samplePayload, refreshIntervalSeconds: 0});

    expect(getCachedConfigValue("Endpoint:Service:Api")).toBeNull();
  });

  it("invalidates by key and globally", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoint:Service:Api", samplePayload);
    setCachedConfigValue("Auth:JWT:Secret", {...samplePayload, name: "Auth:JWT:Secret"});

    invalidateConfigValueCache("Endpoint:Service:Api");
    expect(getCachedConfigValue("Endpoint:Service:Api")).toBeNull();
    expect(getCachedConfigValue("Auth:JWT:Secret")?.name).toBe("Auth:JWT:Secret");

    invalidateConfigValueCache();
    expect(getCachedConfigValue("Auth:JWT:Secret")).toBeNull();
  });
});
