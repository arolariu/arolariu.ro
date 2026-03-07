/**
 * @fileoverview Server-only run-time fetchers for the exp service.
 *
 * Provides {@link getWebsiteFeatureFlags} as the primary integration point for
 * `app/layout.tsx`.  Handles in-memory TTL caching, bearer-token acquisition,
 * and graceful fallback to {@link DEFAULT_FEATURE_FLAGS} on any network/parse
 * failure so the website always renders even when exp is unavailable.
 *
 * URL resolution (deterministic, matches configProxy.ts):
 *   - `AZURE_CLIENT_ID` present → `https://exp.arolariu.ro`
 *   - otherwise               → `http://exp`   (local Docker / CI)
 *
 * @module sites/arolariu.ro/src/lib/config/configBootstrap.server
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {
  DEFAULT_FEATURE_FLAGS,
  deriveFeatureFlags,
  isBootstrapResponse,
  type BootstrapResponse,
  type WebsiteFeatureFlags,
} from "@/lib/config/configBootstrap.types";

// ─────────────────────────────────────────────────────────────────────────────
// URL & target constants  (kept in sync with configProxy.ts)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line sonarjs/no-clear-text-protocols -- local Docker communication intentionally uses the exp service DNS name over the internal bridge network
const EXP_BASE_URL: string = process.env["AZURE_CLIENT_ID"] ? "https://exp.arolariu.ro" : "http://exp";

const EXP_TARGET = "website" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Internal cache
// ─────────────────────────────────────────────────────────────────────────────

type BootstrapCacheEntry = Readonly<{
  data: BootstrapResponse;
  fetchedAt: number;
}>;

let bootstrapCache: BootstrapCacheEntry | null = null;

function updateBootstrapCache(data: BootstrapResponse): BootstrapResponse {
  bootstrapCache = {data, fetchedAt: Date.now()};
  return data;
}

/** Clears both in-memory caches.  Primarily for test teardown. */
export function invalidateBootstrapCache(): void {
  bootstrapCache = null;
}

function isCacheFresh(fetchedAt: number): boolean {
  const ttlMs = (bootstrapCache?.data.refreshIntervalSeconds ?? 300) * 1000;
  return Date.now() - fetchedAt < ttlMs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bearer token (Azure Managed Identity — Azure only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a Bearer token for exp when running on Azure (AZURE_CLIENT_ID set).
 * Returns an empty string in local / Docker environments.
 */
async function getBearerToken(): Promise<string> {
  if (!process.env["AZURE_CLIENT_ID"]) return "";
  try {
    const {getAzureCredential} = await import("@/lib/azure/credentials");
    const credential = getAzureCredential();
    const token = await credential.getToken("api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default");
    return token?.token ?? "";
  } catch {
    return "";
  }
}

/**
 * Builds HTTP request headers for exp build-time/run-time requests.
 */
async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {"X-Exp-Target": EXP_TARGET};
  const token = await getBearerToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches and caches the bootstrap payload for the website target.
 *
 * @remarks
 * Calls `/api/v1/run-time?for=website`.  Throws when the response is
 * non-2xx or the payload fails the type guard.
 *
 * @returns Parsed {@link BootstrapResponse}.
 * @throws When exp is unreachable or returns an invalid payload.
 */
export async function fetchBootstrap(): Promise<BootstrapResponse> {
  if (bootstrapCache && isCacheFresh(bootstrapCache.fetchedAt)) {
    return bootstrapCache.data;
  }

  const headers = await buildHeaders();
  const response = await fetch(`${EXP_BASE_URL}/api/v1/run-time?for=${EXP_TARGET}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers,
  });

  if (!response.ok) {
    throw new Error(`[configBootstrap] /api/v1/run-time returned ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isBootstrapResponse(payload)) {
    throw new Error("[configBootstrap] Run-time response payload failed type guard.");
  }

  return updateBootstrapCache(payload);
}

/**
 * Returns derived website feature flags, always with a safe fallback.
 *
 * @remarks
 * Uses `/api/v1/run-time` and returns {@link DEFAULT_FEATURE_FLAGS} when the
 * endpoint is unavailable so the website
 * always renders — exp downtime must never break the UI.
 *
 * **Only this function's return value is safe to pass to client components.**
 * The underlying {@link BootstrapResponse} payload must remain server-side.
 *
 * @returns Derived {@link WebsiteFeatureFlags} booleans.
 */
export async function getWebsiteFeatureFlags(): Promise<WebsiteFeatureFlags> {
  try {
    const bootstrap = await fetchBootstrap();
    return deriveFeatureFlags(bootstrap.features);
  } catch (bootstrapError) {
    console.warn("[configBootstrap] /api/v1/run-time unavailable. Using default feature flags.", bootstrapError);
  }

  return DEFAULT_FEATURE_FLAGS;
}
