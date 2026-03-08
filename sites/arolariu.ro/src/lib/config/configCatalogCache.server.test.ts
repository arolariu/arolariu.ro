/**
 * @fileoverview Unit tests for server-side single-key config cache.
 * @module sites/arolariu.ro/src/lib/config/configCatalogCache.server.test
 */

import {describe, expect, it} from "vitest";

import {getCachedConfigValue, invalidateConfigValueCache, setCachedConfigValue} from "./configCatalogCache.server";

const samplePayload = {
  name: "Service:Api:Url",
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
    setCachedConfigValue("Service:Api:Url", samplePayload);

    expect(getCachedConfigValue("Service:Api:Url")).toEqual(samplePayload);
  });

  it("returns null for missing entries", () => {
    invalidateConfigValueCache();
    expect(getCachedConfigValue("Service:Api:Url")).toBeNull();
  });

  it("returns null for stale entries", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Service:Api:Url", {...samplePayload, refreshIntervalSeconds: 0});

    expect(getCachedConfigValue("Service:Api:Url")).toBeNull();
  });

  it("invalidates by key and globally", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Service:Api:Url", samplePayload);
    setCachedConfigValue("Auth:JWT:Secret", {...samplePayload, name: "Auth:JWT:Secret"});

    invalidateConfigValueCache("Service:Api:Url");
    expect(getCachedConfigValue("Service:Api:Url")).toBeNull();
    expect(getCachedConfigValue("Auth:JWT:Secret")?.name).toBe("Auth:JWT:Secret");

    invalidateConfigValueCache();
    expect(getCachedConfigValue("Auth:JWT:Secret")).toBeNull();
  });
});
