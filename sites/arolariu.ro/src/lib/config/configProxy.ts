/**
 * @fileoverview Server-side-only config proxy client with per-key TTL caching.
 *
 * Config URL is determined deterministically by `AZURE_CLIENT_ID` presence:
 *   - `AZURE_CLIENT_ID` set -> `https://exp.arolariu.ro`  (Azure / production)
 *   - otherwise             -> `http://exp`               (local Docker / CI)
 *
 * The website consumes the exp service through the single-key endpoint:
 * `/api/v1/config?name=<config-key>`.
 *
 * @module sites/arolariu.ro/src/lib/config/configProxy
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {isConfigValueResponse, type ConfigValueResponse} from "@/lib/config/configCatalog.types";
import {getCachedConfigValue, invalidateConfigValueCache, setCachedConfigValue} from "@/lib/config/configCatalogCache.server";

/** `true` when running on Azure with a Managed Identity client ID configured. */
const HAS_AZURE_CLIENT_ID = Boolean(process.env["AZURE_CLIENT_ID"]);

/**
 * Azure AD token scope for the experiments service.
 * Used for Managed Identity bearer-token acquisition in Azure deployments.
 */
export const EXP_SERVICE_TOKEN_SCOPE = "api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default" as const;

/**
 * Base URL for the experiments / config service.
 *
 * Determined once at module load time so every fetch uses the same endpoint.
 * Local Docker Compose exposes the service as `http://exp` (not localhost).
 */
// eslint-disable-next-line sonarjs/no-clear-text-protocols -- local Docker communication intentionally uses the exp service DNS name over the internal bridge network
const CONFIG_PROXY_URL: string = HAS_AZURE_CLIENT_ID ? "https://exp.arolariu.ro" : "http://exp";
const WEBSITE_TARGET = "website" as const;

/**
 * Acquires a Bearer token for the experiments service.
 * Returns an empty string when `AZURE_CLIENT_ID` is not set (local / Docker).
 */
async function getBearerToken(): Promise<string> {
  if (!HAS_AZURE_CLIENT_ID) return "";

  const {getAzureCredential} = await import("@/lib/azure/credentials");
  const credential = getAzureCredential();
  const token = await credential.getToken(EXP_SERVICE_TOKEN_SCOPE);

  return token?.token ?? "";
}

/**
 * Builds request headers for exp proxy requests.
 */
async function getRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {"X-Exp-Target": WEBSITE_TARGET};
  const bearerToken = await getBearerToken();
  if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;
  return headers;
}

/**
 * Fetches one typed config payload from exp, honoring the process-local cache.
 * @param key - Canonical exp config key name.
 * @returns Typed single-key payload.
 */
async function getConfigPayload(key: string): Promise<ConfigValueResponse> {
  const cachedPayload = getCachedConfigValue(key);
  if (cachedPayload) return cachedPayload;

  const headers = await getRequestHeaders();
  const response = await fetch(`${CONFIG_PROXY_URL}/api/v1/config?name=${encodeURIComponent(key)}`, {
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch config '${key}' (status=${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!isConfigValueResponse(payload)) {
    throw new Error(`Invalid config response payload for key '${key}'.`);
  }

  setCachedConfigValue(key, payload);
  return payload;
}

function logProxyError(message: string, error: unknown): void {
  console.error({error, message: String(message)});
}

/**
 * Fetches a single config value from exp.
 * Server-only — guarded by the `server-only` package import.
 */
export async function fetchConfigValue(key: string): Promise<string> {
  try {
    const payload = await getConfigPayload(key);
    return payload.value;
  } catch (error) {
    logProxyError(`[configProxy] Failed to fetch key "${key}".`, error);
    throw error;
  }
}

/**
 * Fetches multiple config values in parallel.
 */
export async function fetchConfigValues(keys: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(keys.map(async (key) => [key, await fetchConfigValue(key)] as const));

  return Object.fromEntries(entries);
}

/** Invalidates one cached config value or the entire cache. */
export function invalidateConfigCache(key?: string): void {
  invalidateConfigValueCache(key);
}
