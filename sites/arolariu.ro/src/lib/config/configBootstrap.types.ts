/**
 * @fileoverview Types and runtime guards for exp run-time responses.
 *
 * Covers the run-time endpoint served by the experiments/config service:
 *   - /api/v1/run-time?for=website  → {@link BootstrapResponse}
 *
 * Neither of these types should ever be serialised to the browser.
 * Consumers must derive {@link WebsiteFeatureFlags} and forward only the
 * derived booleans to client components.
 *
 * @module sites/arolariu.ro/src/lib/config/configBootstrap.types
 */

// ─────────────────────────────────────────────────────────────────────────────
// Feature key constants
// ─────────────────────────────────────────────────────────────────────────────

/** Well-known feature flag keys served by exp for the website target. */
export type WebsiteFeatureKey = "website.commander.enabled" | "website.web-vitals.enabled";

/** All recognised website feature-flag key strings as a readonly tuple. */
export const WEBSITE_FEATURE_KEYS = [
  "website.commander.enabled",
  "website.web-vitals.enabled",
] as const satisfies ReadonlyArray<WebsiteFeatureKey>;

// ─────────────────────────────────────────────────────────────────────────────
// Derived public type (safe to pass to client components)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derived website feature flags — the only exp-sourced type that may be
 * forwarded to client components.
 *
 * @remarks
 * These are plain booleans derived on the server; no raw exp payload is
 * included.  Passing this type to a Client Component is safe.
 */
export type WebsiteFeatureFlags = Readonly<{
  /** Whether the command-palette (Commander) component should be mounted. */
  commanderEnabled: boolean;
  /** Whether the Web Vitals reporting component should be mounted. */
  webVitalsEnabled: boolean;
}>;

/**
 * Safe default when exp is unavailable.
 *
 * @remarks
 * Defaults to `true` so that features remain visible in local development
 * where exp may not be reachable.
 */
export const DEFAULT_FEATURE_FLAGS: WebsiteFeatureFlags = {
  commanderEnabled: true,
  webVitalsEnabled: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap response type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payload returned by `/api/v1/run-time?for=website`.
 *
 * @remarks **Server-only** — never forward this type to the browser.
 */
export type BootstrapResponse = Readonly<{
  target: "website";
  /** Semantic version of the contract schema. */
  contractVersion: string;
  /** Version tag of the run-time document used by this response. */
  version: string;
  /** Inline config key/value pairs. */
  config: Readonly<Record<string, string>>;
  /** Feature flag key/boolean pairs. */
  features: Readonly<Record<string, boolean>>;
  /** How often (in seconds) the client should refresh this data. */
  refreshIntervalSeconds: number;
  /** ISO-8601 timestamp when exp generated this response. */
  fetchedAt: string;
}>;

// ─────────────────────────────────────────────────────────────────────────────
// Runtime type guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when every value in `value` is a `string`.
 */
function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === "string");
}

/**
 * Returns true when every value in `value` is a `boolean`.
 */
function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === "boolean");
}

/**
 * Runtime type guard for `/api/v1/run-time?for=website` payloads.
 * @param value - Unknown payload to validate.
 * @returns `true` when the payload matches {@link BootstrapResponse}.
 */
export function isBootstrapResponse(value: unknown): value is BootstrapResponse {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<BootstrapResponse>;
  return (
    c.target === "website"
    && typeof c.contractVersion === "string"
    && typeof c.version === "string"
    && isStringRecord(c.config)
    && isBooleanRecord(c.features)
    && typeof c.refreshIntervalSeconds === "number"
    && typeof c.fetchedAt === "string"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Derivation helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives {@link WebsiteFeatureFlags} from a raw features record.
 *
 * @param features - The `features` field from a {@link BootstrapResponse}.
 * @returns Plain boolean flags — safe to pass to client components.
 */
export function deriveFeatureFlags(features: Readonly<Record<string, boolean>>): WebsiteFeatureFlags {
  return {
    commanderEnabled: features["website.commander.enabled"] ?? DEFAULT_FEATURE_FLAGS.commanderEnabled,
    webVitalsEnabled: features["website.web-vitals.enabled"] ?? DEFAULT_FEATURE_FLAGS.webVitalsEnabled,
  };
}
