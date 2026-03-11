/**
 * @fileoverview Server-side-only config proxy client with per-key TTL caching
 * and typed config value helpers with env-var fallback.
 *
 * Config URL is determined deterministically by `AZURE_CLIENT_ID` presence:
 *   - `AZURE_CLIENT_ID` set -> `https://exp.arolariu.ro`  (Azure / production)
 *   - otherwise             -> `http://exp`               (local Docker / CI)
 *
 * The website consumes the exp service through the single-key endpoint:
 * `/api/v1/config?name=<config-key>`.
 *
 * Typed helpers (`fetchApiUrl`, `fetchApiJwtSecret`, `fetchResendApiKey`) resolve
 * specific whitelisted keys and fall back to environment variables when exp is
 * unavailable.
 *
 * @module sites/arolariu.ro/src/lib/config/configProxy
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {addSpanEvent, injectTraceContextHeaders, logWithTrace, withSpan} from "@/instrumentation.server";
// ─────────────────────────────────────────────────────────────────────────────
// Types & runtime guards (consolidated from configCatalog.types.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Typed payload returned by `/api/v1/config?name=<config-key>`.
 */
type ConfigValueResponse = Readonly<{
  name: string;
  value: string;
  availableForTargets: ReadonlyArray<string>;
  availableInDocuments: ReadonlyArray<string>;
  requiredInDocuments: ReadonlyArray<string>;
  description: string;
  usage: string;
  refreshIntervalSeconds: number;
  fetchedAt: string;
}>;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/**
 * Runtime type guard for single-key config payloads.
 * @param value - Unknown payload to validate.
 * @returns True when payload matches the exp config-value response shape.
 */
export function isConfigValueResponse(value: unknown): value is ConfigValueResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ConfigValueResponse>;

  return (
    typeof candidate.name === "string"
    && typeof candidate.value === "string"
    && isStringArray(candidate.availableForTargets)
    && isStringArray(candidate.availableInDocuments)
    && isStringArray(candidate.requiredInDocuments)
    && typeof candidate.description === "string"
    && typeof candidate.usage === "string"
    && typeof candidate.refreshIntervalSeconds === "number"
    && typeof candidate.fetchedAt === "string"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side in-memory cache (consolidated from configCatalogCache.server.ts)
// ─────────────────────────────────────────────────────────────────────────────

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
const EXP_BASE_URL: string = HAS_AZURE_CLIENT_ID ? "https://exp.arolariu.ro" : "http://exp";
const WEBSITE_TARGET = "website" as const;

/**
 * Timeout for exp config fetches.
 * Azure (production): 10 seconds — exp is reliably reachable.
 * Local dev: 2 seconds — exp may not be running; fail fast to env-var fallback.
 */
const CONFIG_FETCH_TIMEOUT_MS = HAS_AZURE_CLIENT_ID ? 10_000 : 2_000;

/**
 * Azure App Configuration label derived from `SITE_ENV`.
 *
 * When `SITE_ENV` equals `"PRODUCTION"` the PRODUCTION label is requested;
 * all other values (including absent) resolve to the DEVELOPMENT label.
 */
const CONFIG_LABEL: string =
  (process.env["SITE_ENV"] ?? "").toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "DEVELOPMENT";

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
  const baseHeaders = new Headers({"X-Exp-Target": WEBSITE_TARGET});
  const injectedHeaders = injectTraceContextHeaders(baseHeaders);
  const headers = injectedHeaders instanceof Headers ? injectedHeaders : new Headers(baseHeaders);

  if (!(injectedHeaders instanceof Headers)) {
    for (const [key, value] of new Headers(injectedHeaders).entries()) {
      headers.set(key, value);
    }
  }

  const bearerToken = await getBearerToken();
  if (bearerToken) headers.set("Authorization", `Bearer ${bearerToken}`);
  return Object.fromEntries(headers.entries());
}

/**
 * Circuit breaker: once exp is unreachable, skip further network calls for this duration.
 * Local dev: 5 minutes — exp is typically not running at all, avoid periodic 2s stalls.
 * Production: 30 seconds — exp should recover quickly from transient failures.
 */
let expCircuitOpen = false;
let expCircuitOpenedAt = 0;
const CIRCUIT_RESET_MS = HAS_AZURE_CLIENT_ID ? 30_000 : 300_000;

function isExpCircuitOpen(): boolean {
  if (!expCircuitOpen) return false;
  if (Date.now() - expCircuitOpenedAt > CIRCUIT_RESET_MS) {
    expCircuitOpen = false;
    return false;
  }
  return true;
}

/**
 * Fetches one typed config payload from exp, honoring the process-local cache.
 * @param key - Canonical exp config key name.
 * @returns Typed single-key payload.
 */
async function getConfigPayload(key: string): Promise<ConfigValueResponse> {
  const cachedPayload = getCachedConfigValue(key);
  if (cachedPayload) {
    logWithTrace("debug", "Config cache hit", {key, source: "cache"}, "server");
    return cachedPayload;
  }

  if (isExpCircuitOpen()) {
    throw new Error(`exp circuit breaker open — skipping fetch for '${key}'`);
  }

  return withSpan("http.client.exp.config.fetch", async () => {
    addSpanEvent("exp.config.fetch.start", {key});

    const headers = await getRequestHeaders();
    const response = await fetch(`${EXP_BASE_URL}/api/v1/config?name=${encodeURIComponent(key)}&label=${encodeURIComponent(CONFIG_LABEL)}`, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(CONFIG_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      addSpanEvent("exp.config.fetch.error", {key, status: response.status});
      logWithTrace("error", "exp returned non-OK status for config key", {key, status: response.status}, "server");
      throw new Error(`Failed to fetch config '${key}' (status=${response.status}).`);
    }

    const payload: unknown = await response.json();
    if (!isConfigValueResponse(payload)) {
      addSpanEvent("exp.config.fetch.invalid", {key});
      logWithTrace("error", "Invalid config response payload from exp", {key}, "server");
      throw new Error(`Invalid config response payload for key '${key}'.`);
    }

    setCachedConfigValue(key, payload);
    addSpanEvent("exp.config.fetch.complete", {key, cached: true});
    logWithTrace("debug", "Config fetched from exp and cached", {key}, "server");
    return payload;
  });
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
    // Trip the circuit breaker so subsequent calls fail fast
    expCircuitOpen = true;
    expCircuitOpenedAt = Date.now();
    logWithTrace("warn", `Failed to fetch config key "${key}" from exp — circuit breaker tripped`, {key, error: String(error)}, "server");
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

// ─────────────────────────────────────────────────────────────────────────────
// Typed config value helpers (with env-var fallback)
// ─────────────────────────────────────────────────────────────────────────────

/** exp config key for the backend REST API base URL. */
const EXP_KEY_API_URL = "Endpoints:Service:Api" as const;

/** exp config key for the HS256 JWT signing secret. */
const EXP_KEY_API_JWT_SECRET = "Auth:JWT:Secret" as const;

/** exp config key for the Resend transactional-email API key (optional). */
const EXP_KEY_RESEND_API_KEY = "Communication:Email:ApiKey" as const;

/**
 * Returns the backend REST API base URL.
 *
 * @remarks
 * Reads `Endpoints:Service:Api` from exp.  Falls back to `process.env.API_URL` when
 * exp is unavailable.
 *
 * @returns Base URL string (e.g. `"https://api.arolariu.ro"`).
 */
export async function fetchApiUrl(): Promise<string> {
  try {
    const value = await fetchConfigValue(EXP_KEY_API_URL);
    if (value) return value;
  } catch {
    logWithTrace("warn", "Falling back to API_URL env var — exp unavailable", {key: EXP_KEY_API_URL}, "server");
  }
  return process.env["API_URL"] ?? "";
}

/**
 * Returns the HS256 JWT signing secret used to mint BFF tokens.
 *
 * @remarks
 * Reads `Auth:JWT:Secret` from exp.  Falls back to `process.env.API_JWT`
 * when exp is unavailable.
 *
 * **Security**: The returned value is a cryptographic secret.  Never log,
 * serialise, or forward it to the browser.
 *
 * @returns Base64-encoded HS256 signing secret.
 */
export async function fetchApiJwtSecret(): Promise<string> {
  try {
    const value = await fetchConfigValue(EXP_KEY_API_JWT_SECRET);
    if (value) return value;
  } catch {
    logWithTrace("warn", "Falling back to API_JWT env var — exp unavailable", {key: EXP_KEY_API_JWT_SECRET}, "server");
  }
  return process.env["API_JWT"] ?? "";
}

/**
 * Returns the Resend transactional-email API key.
 *
 * @remarks
 * Reads `Communication:Email:ApiKey` from exp (optional config key).
 * Falls back to `process.env.RESEND_API_KEY` when exp is unavailable or
 * the key is absent from the exp registry.
 *
 * **Security**: The returned value is a secret API key.  Never log,
 * serialise, or forward it to the browser.
 *
 * @returns Resend API key string, or empty string if not configured.
 */
export async function fetchResendApiKey(): Promise<string> {
  try {
    const value = await fetchConfigValue(EXP_KEY_RESEND_API_KEY);
    if (value) return value;
  } catch {
    logWithTrace("warn", "Falling back to RESEND_API_KEY env var — exp unavailable", {key: EXP_KEY_RESEND_API_KEY}, "server");
  }
  return process.env["RESEND_API_KEY"] ?? "";
}
