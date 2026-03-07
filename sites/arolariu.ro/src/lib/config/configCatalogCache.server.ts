/**
 * @fileoverview Server-side in-memory cache for single-key exp config payloads.
 * @module sites/arolariu.ro/src/lib/config/configCatalogCache.server
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import type {ConfigValueResponse} from "@/lib/config/configCatalog.types";

type ConfigValueCacheEntry = Readonly<{
  payload: ConfigValueResponse;
  fetchedAt: number;
}>;

const configValueCache = new Map<string, ConfigValueCacheEntry>();

/**
 * Returns a cached config value when its server-declared TTL has not elapsed.
 * @param key - Canonical config key name used as the cache key.
 * @returns Cached config payload or null when stale or missing.
 */
export function getCachedConfigValue(key: string): ConfigValueResponse | null {
  const cached = configValueCache.get(key);
  if (!cached) return null;

  const ttlMs = cached.payload.refreshIntervalSeconds * 1000;
  if (Date.now() - cached.fetchedAt >= ttlMs) return null;

  return cached.payload;
}

/**
 * Stores a resolved config value response in the process-local cache.
 * @param key - Canonical config key name used as the cache key.
 * @param payload - Typed single-key config payload returned by exp.
 */
export function setCachedConfigValue(key: string, payload: ConfigValueResponse): void {
  configValueCache.set(key, {payload, fetchedAt: Date.now()});
}

/**
 * Invalidates one cached config value or clears the entire cache.
 * @param key - Optional config key to evict.
 */
export function invalidateConfigValueCache(key?: string): void {
  if (key) {
    configValueCache.delete(key);
    return;
  }

  configValueCache.clear();
}
