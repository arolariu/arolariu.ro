/**
 * @fileoverview Server-side in-memory cache for exp catalog payloads.
 * @module sites/arolariu.ro/src/lib/config/configCatalogCache.server
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import type {ConfigCatalogResponse} from "@/lib/config/configCatalog.types";

/**
 * In-memory catalog cache entry metadata.
 */
type CatalogCacheEntry = Readonly<{
  catalog: ConfigCatalogResponse;
  fetchedAt: number;
}>;

const catalogCache = new Map<string, CatalogCacheEntry>();

/**
 * Gets a cached catalog if still valid.
 * @param target - Caller target used as cache key.
 * @param ttlMs - Cache time-to-live in milliseconds.
 * @returns Cached catalog or null if stale/missing.
 */
export function getCachedCatalog(target: string, ttlMs: number): ConfigCatalogResponse | null {
  const cached = catalogCache.get(target);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt >= ttlMs) return null;
  return cached.catalog;
}

/**
 * Stores the latest catalog in cache.
 * @param target - Caller target used as cache key.
 * @param catalog - Typed catalog payload.
 */
export function setCachedCatalog(target: string, catalog: ConfigCatalogResponse): void {
  catalogCache.set(target, {catalog, fetchedAt: Date.now()});
}

/**
 * Invalidates one cached catalog or all catalogs.
 * @param target - Optional target key; clears all when omitted.
 */
export function invalidateCatalogCache(target?: string): void {
  if (target) {
    catalogCache.delete(target);
    return;
  }
  catalogCache.clear();
}
