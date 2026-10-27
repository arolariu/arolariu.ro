/**
 * @fileoverview Server-side-only config proxy client with per-key TTL caching
 * and typed config value helpers with env-var fallback.
 *
 * Cloud deployments use `https://exp.arolariu.ro`; local deployments use
 * `http://exp`. EXP_PROXY_URL overrides the endpoint. Explicit INFRA=local
 * preserves local routing even when an Azure identity is configured.
 *
 * Startup fetches `/api/v1/run-time?for=website`; keys outside the initialized
 * snapshot use `/api/v1/config?name=<config-key>`.
 *
 * Typed helpers (`fetchApiUrl`, `fetchApiJwtSecret`, `fetchResendApiKey`) resolve
 * the initialized environment, retaining dotenv values if local exp is unavailable.
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
 * Returns a cached config value regardless of TTL (stale-while-revalidate).
 * Used when the circuit breaker is open to serve stale data rather than crash.
 * @param key - Canonical config key name.
 * @returns Cached payload (possibly stale) or null if never fetched.
 */
function getStaleConfigValue(key: string): ConfigValueResponse | null {
  return configValueCache.get(key)?.payload ?? null;
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

/** Whether a managed identity client ID is available; local use does not imply cloud hosting. */
const HAS_AZURE_CLIENT_ID = Boolean(process.env["AZURE_CLIENT_ID"]);
const INFRASTRUCTURE = process.env["INFRA"]?.trim().toLowerCase();
const IS_CLOUD_DEPLOYMENT =
  INFRASTRUCTURE === "azure" || Boolean(process.env["WEBSITE_INSTANCE_ID"]) || (INFRASTRUCTURE !== "local" && HAS_AZURE_CLIENT_ID);

const LEGACY_EXP_SERVICE_TOKEN_SCOPE = "api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default";

/**
 * Resolves the experiments audience from a canonical Entra application client ID.
 * @param clientId - Runtime application ID; blank values retain the legacy audience.
 * @returns The normalized application scope used for Azure token acquisition.
 * @throws Error when non-empty configuration is not a canonical GUID.
 */
export function resolveExpServiceTokenScope(clientId: string | undefined): string {
  const normalized = clientId?.trim().toLowerCase();
  if (!normalized) return LEGACY_EXP_SERVICE_TOKEN_SCOPE;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(normalized)) {
    throw new Error("EXP_ENTRA_APP_CLIENT_ID must be a canonical GUID.");
  }
  return `api://${normalized}/.default`;
}

/** Azure-hosted exp service URL. */
const AZURE_EXP_URL = "https://exp.arolariu.ro";
// eslint-disable-next-line sonarjs/no-clear-text-protocols -- local exp uses its Docker-internal HTTP endpoint
const LOCAL_EXP_URL = "http://exp";

/**
 * Base URL for the experiments / config service.
 *
 * Priority: EXP_PROXY_URL > cloud deployment detection > Docker default.
 * Explicit INFRA=local retains local routing even when Azure credentials exist.
 * Bare-metal dev sets EXP_PROXY_URL=http://localhost:5002 to reach bare-metal exp.
 */
const EXP_BASE_URL: string = process.env["EXP_PROXY_URL"]?.trim() || (IS_CLOUD_DEPLOYMENT ? AZURE_EXP_URL : LOCAL_EXP_URL);

/** Whether to acquire Azure AD tokens — only when targeting the Azure-hosted exp instance. */
const USE_AZURE_AUTH = URL.canParse(EXP_BASE_URL) && new URL(EXP_BASE_URL).origin === AZURE_EXP_URL;

/** Runtime Azure audience; unused Azure configuration cannot break local proxy routing. */
export const EXP_SERVICE_TOKEN_SCOPE: string = USE_AZURE_AUTH
  ? resolveExpServiceTokenScope(process.env["EXP_ENTRA_APP_CLIENT_ID"])
  : LEGACY_EXP_SERVICE_TOKEN_SCOPE;

const WEBSITE_TARGET = "website" as const;

const RUNTIME_ENVIRONMENT_KEYS = {
  "Auth:Clerk:SecretKey": "CLERK_SECRET_KEY",
  "Auth:JWT:Secret": "API_JWT",
  "Auth:JWT:Issuer": "API_JWT_ISSUER",
  "Auth:JWT:Audience": "API_JWT_AUDIENCE",
  "Communication:Email:ApiKey": "RESEND_API_KEY",
  "Endpoints:Service:Api": "API_URL",
  "Endpoints:Storage:Blob": "STORAGE_BLOB_ENDPOINT",
} as const;

let runtimeConfiguration: Readonly<Record<string, string>> | null = null;

/**
 * Timeout for exp config fetches.
 * Azure (production): 10 seconds — exp is reliably reachable.
 * Local dev: 2 seconds — exp may not be running; fail fast to env-var fallback.
 */
const CONFIG_FETCH_TIMEOUT_MS = IS_CLOUD_DEPLOYMENT ? 10_000 : 2000;
const CONFIG_AUTHENTICATION_TIMEOUT_MS = 30_000;

const SAFE_FAILURE_IDENTIFIERS = new Set([
  "Error",
  "TypeError",
  "ReferenceError",
  "AbortError",
  "TimeoutError",
  "RestError",
  "AggregateAuthenticationError",
  "AuthenticationError",
  "AuthenticationRequiredError",
  "CredentialUnavailableError",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
  "ERR_MODULE_NOT_FOUND",
  "MODULE_NOT_FOUND",
]);

function describeConfigurationFailure(failure: unknown): string {
  const failures: unknown[] = [failure];
  const identifiers = new Set<string>();
  for (let index = 0; index < failures.length && index < 8; index += 1) {
    const current = failures[index];
    const {name, code, statusCode, cause, errors} = isRecord(current) ? current : {};
    [name, code]
      .filter((value): value is string => typeof value === "string")
      .filter((value) => SAFE_FAILURE_IDENTIFIERS.has(value))
      .forEach((value) => identifiers.add(value));
    if (typeof statusCode === "number" && Number.isSafeInteger(statusCode) && statusCode >= 100 && statusCode <= 599) {
      identifiers.add(`status=${statusCode}`);
    }
    if (cause) failures.push(cause);
    if (Array.isArray(errors)) failures.push(...errors.slice(0, 5));
  }
  return [...identifiers].join(",") || "unknown";
}

/**
 * Azure App Configuration label derived from `SITE_ENV`.
 *
 * When `SITE_ENV` equals `"PRODUCTION"` the PRODUCTION label is requested;
 * all other values (including absent) resolve to the DEVELOPMENT label.
 */
const CONFIG_LABEL: string = (process.env["SITE_ENV"] ?? "").trim().toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "DEVELOPMENT";

/**
 * Acquires a Bearer token for the experiments service.
 * Returns an empty string when not targeting the Azure-hosted exp instance.
 */
async function getBearerToken(signal?: AbortSignal): Promise<string> {
  if (!USE_AZURE_AUTH) return "";

  const {getAzureCredential} = await import("@/lib/azure/credentials");
  const credential = getAzureCredential();
  const token = signal
    ? await credential.getToken(EXP_SERVICE_TOKEN_SCOPE, {abortSignal: signal})
    : await credential.getToken(EXP_SERVICE_TOKEN_SCOPE);

  if (signal && !token?.token) {
    throw new Error("Azure credential returned no exp access token.");
  }
  return token?.token ?? "";
}

/**
 * Builds request headers for exp proxy requests.
 */
async function getRequestHeaders(signal?: AbortSignal): Promise<Record<string, string>> {
  const baseHeaders = new Headers({"X-Exp-Target": WEBSITE_TARGET});
  const injectedHeaders = injectTraceContextHeaders(baseHeaders);
  const headers = injectedHeaders instanceof Headers ? injectedHeaders : new Headers(baseHeaders);

  if (!(injectedHeaders instanceof Headers)) {
    for (const [key, value] of new Headers(injectedHeaders).entries()) {
      headers.set(key, value);
    }
  }

  const bearerToken = await getBearerToken(signal);
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
const CIRCUIT_RESET_MS = IS_CLOUD_DEPLOYMENT ? 30_000 : 300_000;

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
 * When the circuit breaker is open, returns stale cached values if available
 * rather than throwing — this prevents cold-start crashes when exp is down.
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
    // Return stale cache entry if one exists (ignore TTL when circuit is open)
    const staleEntry = getStaleConfigValue(key);
    if (staleEntry) {
      logWithTrace("debug", "Circuit open — returning stale cached value", {key}, "server");
      return staleEntry;
    }
    throw new Error(`exp circuit breaker open — skipping fetch for '${key}'`);
  }

  return withSpan("http.client.exp.config.fetch", async () => {
    addSpanEvent("exp.config.fetch.start", {key});

    const headers = await getRequestHeaders();
    const response = await fetch(
      `${EXP_BASE_URL}/api/v1/config?name=${encodeURIComponent(key)}&label=${encodeURIComponent(CONFIG_LABEL)}`,
      {
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(CONFIG_FETCH_TIMEOUT_MS),
      },
    );

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
  const initializedValue = runtimeConfiguration && Object.hasOwn(runtimeConfiguration, key) ? runtimeConfiguration[key] : undefined;
  if (initializedValue !== undefined) return initializedValue;

  if (isExpCircuitOpen()) {
    const variable = Object.entries(RUNTIME_ENVIRONMENT_KEYS).find(([configKey]) => configKey === key)?.[1];
    const localValue = variable ? process.env[variable] : undefined;
    if (localValue !== undefined) return localValue;
  }

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

/**
 * Initializes private environment configuration before Next.js serves requests.
 *
 * @remarks
 * Called by the existing Node.js instrumentation hook. Fetches the complete exp
 * runtime document once per initialization and retains it for server-side reads.
 * Local deployments fall back to dotenv when exp is unreachable; cloud failures
 * stop initialization. Public configuration remains CI/build-owned. Build workers
 * never fetch private values, and runtime values are never logged.
 *
 * @returns Resolves when the runtime environment configuration is initialized.
 * @throws When SITE_ENV is missing/unsupported or cloud configuration is invalid.
 */
export async function initializeRuntimeEnvironmentConfiguration(): Promise<void> {
  const environment = process.env["SITE_ENV"]?.trim().toUpperCase();
  if (environment !== "PRODUCTION" && environment !== "DEVELOPMENT") {
    throw new Error("SITE_ENV must be set to PRODUCTION or DEVELOPMENT before runtime configuration can be initialized.");
  }
  if (process.env["NEXT_PHASE"] === "phase-production-build") return;

  const endpointUrl = `${EXP_BASE_URL.replace(/\/$/u, "")}/api/v1/run-time`;
  if (!URL.canParse(endpointUrl)) {
    throw new Error("EXP_PROXY_URL must be a valid URL.");
  }
  const endpoint = new URL(endpointUrl);
  endpoint.searchParams.set("for", WEBSITE_TARGET);
  endpoint.searchParams.set("label", environment);

  let stage: "authentication" | "http" = "authentication";
  const startedAt = Date.now();
  const response = await getRequestHeaders(AbortSignal.timeout(CONFIG_AUTHENTICATION_TIMEOUT_MS))
    .then((headers) => {
      stage = "http";
      const signal = AbortSignal.timeout(CONFIG_FETCH_TIMEOUT_MS);
      return fetch(endpoint.href, {cache: "no-store", headers, signal});
    })
    .catch((error: unknown) => {
      if (IS_CLOUD_DEPLOYMENT) {
        const identityEndpointConfigured = Boolean(process.env["IDENTITY_ENDPOINT"] || process.env["MSI_ENDPOINT"]);
        throw new Error(
          `Unable to fetch private runtime configuration from exp (stage=${stage}; `
            + `failure=${describeConfigurationFailure(error)}; elapsedMs=${Date.now() - startedAt}; `
            + `identityEndpointConfigured=${identityEndpointConfigured}).`,
        );
      }
      expCircuitOpen = true;
      expCircuitOpenedAt = Date.now();
      logWithTrace("warn", "Local exp is unavailable; retaining dotenv runtime configuration", {environment}, "server");
      return null;
    });
  if (response === null) return;
  if (!response.ok) {
    throw new Error(`Failed to fetch private runtime configuration from exp (status=${response.status}).`);
  }

  const payload: unknown = await response.json().catch(() => {
    throw new Error("Invalid website runtime configuration document from exp.");
  });
  if (!isRecord(payload) || payload["target"] !== "website" || !isRecord(payload["config"])) {
    throw new Error("Invalid website runtime configuration document from exp.");
  }

  const entries = Object.entries(payload["config"]).map(([key, value]) => {
    if (typeof value !== "string") {
      throw new TypeError(`Invalid runtime configuration value: ${key}.`);
    }
    return [key, value] as const;
  });
  const config: Readonly<Record<string, string>> = Object.fromEntries(entries);
  if (config["Site:Environment"]?.trim().toUpperCase() !== environment) {
    throw new Error(`Runtime configuration environment does not match ${environment}. Check the exp configuration label.`);
  }
  const resolved = Object.entries(RUNTIME_ENVIRONMENT_KEYS).map(([key, variable]) => {
    const value = config[key];
    if (value === undefined || (key !== "Communication:Email:ApiKey" && !value.trim())) {
      throw new Error(`Missing private runtime configuration: ${key}. Configure the ${environment} label in exp.`);
    }
    return {variable, value};
  });
  for (const {variable, value} of resolved) {
    process.env[variable] = value;
  }
  runtimeConfiguration = config;
  logWithTrace("info", "Private runtime environment configuration initialized", {count: resolved.length, environment}, "server");
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
 * Uses the initialized runtime `API_URL` (or local dotenv value), then the exp
 * proxy when initialization has not supplied a value.
 *
 * @returns Base URL string (e.g. `"https://api.arolariu.ro"`).
 */
export async function fetchApiUrl(): Promise<string> {
  const configuredUrl = process.env["API_URL"];
  if (configuredUrl?.trim()) return configuredUrl;

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
 * Uses `API_JWT` initialized by register() or local dotenv, then the exp proxy
 * when initialization has not supplied a value.
 *
 * **Security**: The returned value is a cryptographic secret.  Never log,
 * serialise, or forward it to the browser.
 *
 * @returns Base64-encoded HS256 signing secret.
 */
export async function fetchApiJwtSecret(): Promise<string> {
  const configuredSecret = process.env["API_JWT"];
  if (configuredSecret?.trim()) return configuredSecret;

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
 * Uses `RESEND_API_KEY` initialized by register() or local dotenv, including an
 * explicit empty value to disable delivery. Uses exp when the variable is absent.
 *
 * **Security**: The returned value is a secret API key.  Never log,
 * serialise, or forward it to the browser.
 *
 * @returns Resend API key string, or empty string if not configured.
 */
export async function fetchResendApiKey(): Promise<string> {
  const configuredKey = process.env["RESEND_API_KEY"];
  if (configuredKey !== undefined) return configuredKey;

  try {
    const value = await fetchConfigValue(EXP_KEY_RESEND_API_KEY);
    if (value) return value;
  } catch {
    logWithTrace("warn", "Falling back to RESEND_API_KEY env var — exp unavailable", {key: EXP_KEY_RESEND_API_KEY}, "server");
  }
  return process.env["RESEND_API_KEY"] ?? "";
}
