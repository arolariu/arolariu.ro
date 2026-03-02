/**
 * @fileoverview Unit tests for server-side config catalog cache.
 * @module sites/arolariu.ro/src/lib/config/configCatalogCache.server.test
 */

import {describe, expect, it} from "vitest";

import {getCachedCatalog, invalidateCatalogCache, setCachedCatalog} from "./configCatalogCache.server";

const sampleCatalog = {
  target: "website",
  version: "v1",
  requiredKeys: ["Common:Auth:Issuer"],
  optionalKeys: [],
  allowedPrefixes: [],
  refreshIntervalSeconds: 300,
} as const;

describe("configCatalogCache.server", () => {
  it("stores and retrieves a catalog entry", () => {
    invalidateCatalogCache();
    setCachedCatalog("website", sampleCatalog);
    const cached = getCachedCatalog("website", 60_000);
    expect(cached).toEqual(sampleCatalog);
  });

  it("returns null for missing entries", () => {
    invalidateCatalogCache();
    expect(getCachedCatalog("website", 60_000)).toBeNull();
  });

  it("returns null for stale entries", () => {
    invalidateCatalogCache();
    setCachedCatalog("website", sampleCatalog);
    expect(getCachedCatalog("website", 0)).toBeNull();
  });

  it("invalidates by target and globally", () => {
    invalidateCatalogCache();
    setCachedCatalog("website", sampleCatalog);
    setCachedCatalog("api", {...sampleCatalog, target: "api"});

    invalidateCatalogCache("website");
    expect(getCachedCatalog("website", 60_000)).toBeNull();
    expect(getCachedCatalog("api", 60_000)?.target).toBe("api");

    invalidateCatalogCache();
    expect(getCachedCatalog("api", 60_000)).toBeNull();
  });
});
