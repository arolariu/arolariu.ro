/**
 * @fileoverview Server-side-only config proxy client with TTL caching.
 *
 * Config URL is hardcoded:
 * - Azure (production): https://experiments.arolariu.ro
 * - Local (INFRA=proxy): http://localhost:5002
 *
 * @module sites/arolariu.ro/src/lib/config/configProxy
 */

"use server";

const INFRA = process.env["INFRA"] ?? "local";
const CONFIG_PROXY_URL = INFRA === "proxy" ? "http://localhost:5002" : "https://experiments.arolariu.ro";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  const token = await credential.getToken("api://experiments-arolariu-ro/.default");
  return token?.token ?? "";
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

  try {
    const headers: Record<string, string> = {};
    const bearerToken = await getBearerToken();
    if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

    const response = await fetch(`${CONFIG_PROXY_URL}/api/config/${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers,
    });

    if (!response.ok) return cached?.value ?? "";

    const data = (await response.json()) as {Key: string; Value: string; FetchedAt: string};
    cache.set(key, {value: data.Value, fetchedAt: Date.now()});
    return data.Value;
  } catch (error) {
    console.error(`[configProxy] Failed to fetch key "${key}":`, error);
    return cached?.value ?? "";
  }
}

/**
 * Fetches multiple config values in one batch request.
 */
export async function fetchConfigValues(keys: string[]): Promise<Record<string, string>> {
  const uncachedKeys: string[] = [];
  const result: Record<string, string> = {};

  for (const key of keys) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      result[key] = cached.value;
    } else {
      uncachedKeys.push(key);
    }
  }

  if (uncachedKeys.length === 0) return result;

  try {
    const headers: Record<string, string> = {};
    const bearerToken = await getBearerToken();
    if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

    const keysParam = uncachedKeys.map((k) => encodeURIComponent(k)).join(",");
    const response = await fetch(`${CONFIG_PROXY_URL}/api/config?keys=${keysParam}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers,
    });

    if (response.ok) {
      const data = (await response.json()) as {Values: Array<{Key: string; Value: string}>};
      for (const item of data.Values) {
        cache.set(item.Key, {value: item.Value, fetchedAt: Date.now()});
        result[item.Key] = item.Value;
      }
    }
  } catch (error) {
    console.error(`[configProxy] Failed to fetch batch keys [${uncachedKeys.join(", ")}]:`, error);
    for (const key of uncachedKeys) {
      result[key] = cache.get(key)?.value ?? "";
    }
  }

  return result;
}

/** Invalidates cache for a key or all keys. */
export function invalidateConfigCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}
