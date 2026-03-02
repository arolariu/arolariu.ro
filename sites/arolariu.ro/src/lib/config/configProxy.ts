/**
 * @fileoverview Server-side-only config proxy client with TTL caching.
 *
 * Config URL is hardcoded:
 * - Azure (production): https://exp.arolariu.ro
 * - Local (INFRA=proxy): http://localhost:5002
 *
 * Catalog ownership is delegated to exp via `/api/v2/catalog?for=website`.
 *
 * @module sites/arolariu.ro/src/lib/config/configProxy
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {isConfigCatalogResponse, type ConfigCatalogResponse} from "@/lib/config/configCatalog.types";
import {getCachedCatalog, setCachedCatalog} from "@/lib/config/configCatalogCache.server";

const INFRA = process.env["INFRA"] ?? "local";
const CONFIG_PROXY_URL = INFRA === "azure" ? "https://exp.arolariu.ro" : "http://localhost:5002";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CATALOG_TARGET = "website" as const;

interface CacheEntry {
  value: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Acquires a Bearer token for the experiments service (Azure only).
 * Returns empty string in local/proxy mode.
 */
async function getBearerToken(): Promise<string> {
  if (INFRA !== "azure") return "";
  const {getAzureCredential} = await import("@/lib/azure/credentials");
  const credential = getAzureCredential();
  const token = await credential.getToken("api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default");
  return token?.token ?? "";
}

/**
 * Builds request headers for proxy requests.
 */
async function getRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {"X-Exp-Target": CATALOG_TARGET};
  const bearerToken = await getBearerToken();
  if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;
  return headers;
}

/**
 * Loads and caches the website catalog from exp.
 */
async function getWebsiteCatalog(): Promise<ConfigCatalogResponse> {
  const cachedCatalog = getCachedCatalog(CATALOG_TARGET, CACHE_TTL_MS);
  if (cachedCatalog) return cachedCatalog;

  const headers = await getRequestHeaders();
  const response = await fetch(`${CONFIG_PROXY_URL}/api/v2/catalog?for=${CATALOG_TARGET}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch config catalog for '${CATALOG_TARGET}' (status=${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!isConfigCatalogResponse(payload)) {
    throw new Error("Invalid catalog response payload.");
  }

  setCachedCatalog(CATALOG_TARGET, payload);
  return payload;
}

/**
 * Validates that key is present in catalog.
 */
function assertCatalogContainsKey(catalog: ConfigCatalogResponse, key: string): void {
  const catalogKeys = new Set([...catalog.requiredKeys, ...catalog.optionalKeys]);
  if (catalogKeys.has(key)) return;

  throw new Error(`Key '${key}' is not declared in the '${catalog.target}' catalog.`);
}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return Boolean(entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS);
}

function getMissingRequiredKeys(catalog: ConfigCatalogResponse, keys: ReadonlyArray<string>): string[] {
  return keys.filter((key) => catalog.requiredKeys.includes(key) && !cache.get(key)?.value);
}

function splitCachedValues(keys: ReadonlyArray<string>): Readonly<{result: Record<string, string>; uncachedKeys: string[]}> {
  const result: Record<string, string> = {};
  const uncachedKeys: string[] = [];

  for (const key of keys) {
    const cached = cache.get(key);
    if (isFresh(cached)) {
      result[key] = cached.value;
    } else {
      uncachedKeys.push(key);
    }
  }

  return {result, uncachedKeys};
}

async function fetchBatchValues(uncachedKeys: ReadonlyArray<string>): Promise<Map<string, string>> {
  const keysParam = uncachedKeys.map((key) => encodeURIComponent(key)).join(",");
  const response = await fetch(`${CONFIG_PROXY_URL}/api/v2/config?keys=${keysParam}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: await getRequestHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch config batch values (status=${response.status}).`);
  }

  const data = (await response.json()) as {values: Array<{key: string; value: string}>};
  return new Map(data.values.map((entry) => [entry.key, entry.value]));
}

function applyBatchValues(
  catalog: ConfigCatalogResponse,
  uncachedKeys: ReadonlyArray<string>,
  fetchedValues: ReadonlyMap<string, string>,
  result: Record<string, string>,
): void {
  for (const key of uncachedKeys) {
    const fetchedValue = fetchedValues.get(key) ?? "";
    const cachedValue = cache.get(key)?.value ?? "";
    const valueToUse = fetchedValue || cachedValue;

    if (catalog.requiredKeys.includes(key) && !valueToUse) {
      throw new Error(`Required key '${key}' returned an empty value from config proxy.`);
    }

    cache.set(key, {value: valueToUse, fetchedAt: Date.now()});
    result[key] = valueToUse;
  }
}

function applyFallbackValues(result: Record<string, string>, uncachedKeys: ReadonlyArray<string>): void {
  for (const key of uncachedKeys) {
    result[key] = cache.get(key)?.value ?? "";
  }
}

function logProxyError(message: string, error: unknown): void {
  const payload = {error, message: String(message)};

  if (INFRA === "azure") {
    console.error(payload);
    return;
  }

  console.error(payload);
}

/**
 * Fetches a single config value with TTL caching + stale-while-revalidate.
 * Server-only — enforced by "use server" directive.
 */
export async function fetchConfigValue(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  let requiredKeyWithoutFallback = false;
  try {
    const catalog = await getWebsiteCatalog();
    assertCatalogContainsKey(catalog, key);
    const isRequiredKey = catalog.requiredKeys.includes(key);
    requiredKeyWithoutFallback = isRequiredKey && !cached;

    const response = await fetch(`${CONFIG_PROXY_URL}/api/v2/config/${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: await getRequestHeaders(),
    });

    if (!response.ok) {
      if (isRequiredKey && !cached) {
        throw new Error(`Required key '${key}' could not be resolved from config proxy.`);
      }
      return cached?.value ?? "";
    }

    const data = (await response.json()) as {key: string; value: string; fetchedAt: string};
    cache.set(key, {value: data.value, fetchedAt: Date.now()});
    return data.value;
  } catch (error) {
    logProxyError(`[configProxy] Failed to fetch key "${key}".`, error);
    if (requiredKeyWithoutFallback) {
      throw error;
    }
    return cached?.value ?? "";
  }
}

/**
 * Fetches multiple config values in one batch request.
 */
export async function fetchConfigValues(keys: string[]): Promise<Record<string, string>> {
  const catalog = await getWebsiteCatalog();
  for (const key of keys) {
    assertCatalogContainsKey(catalog, key);
  }

  const {result, uncachedKeys} = splitCachedValues(keys);

  if (uncachedKeys.length === 0) return result;

  try {
    const fetchedValues = await fetchBatchValues(uncachedKeys);
    applyBatchValues(catalog, uncachedKeys, fetchedValues, result);
    return result;
  } catch (error) {
    logProxyError(`[configProxy] Failed to fetch batch keys [${uncachedKeys.join(", ")}].`, error);
    const missingRequiredKeys = getMissingRequiredKeys(catalog, uncachedKeys);
    if (missingRequiredKeys.length > 0) {
      throw new Error(`Required keys could not be resolved from config proxy: ${missingRequiredKeys.join(", ")}`, {cause: error});
    }

    applyFallbackValues(result, uncachedKeys);
    return result;
  }
}

/** Invalidates cache for a key or all keys. */
export function invalidateConfigCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/** Invalidates catalog cache for one target or all targets. */
export {invalidateCatalogCache} from "@/lib/config/configCatalogCache.server";
