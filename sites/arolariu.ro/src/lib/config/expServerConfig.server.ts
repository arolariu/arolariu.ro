/**
 * @fileoverview Server-only helpers for reading API config values from exp.
 *
 * These async getters replace direct reads of `API_URL`, `API_JWT`, and
 * `RESEND_API_KEY` environment variables.  Each function:
 *   1. Queries the exp config proxy (via {@link fetchConfigValue}).
 *   2. Falls back to the corresponding environment variable when exp is
 *      unavailable, to preserve backward compatibility during the migration.
 *
 * **Never expose the return values of these functions to the browser.**
 * The values are secrets or internal endpoints — they must stay server-only.
 *
 * exp config keys consumed by the website target:
 *   - `Endpoints:Api`             → backend REST API base URL
 *   - `Common:Auth:Secret`        → HS256 JWT signing secret
 *   - `Communication:Resend:ApiKey` → Resend transactional-email API key (optional)
 *
 * @module sites/arolariu.ro/src/lib/config/expServerConfig.server
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {fetchConfigValue} from "@/lib/config/configProxy";

// ─────────────────────────────────────────────────────────────────────────────
// exp config key constants
// ─────────────────────────────────────────────────────────────────────────────

/** exp config key for the backend REST API base URL. */
const EXP_KEY_API_URL = "Endpoints:Api" as const;

/** exp config key for the HS256 JWT signing secret. */
const EXP_KEY_API_JWT_SECRET = "Common:Auth:Secret" as const;

/** exp config key for the Resend transactional-email API key (optional). */
const EXP_KEY_RESEND_API_KEY = "Communication:Resend:ApiKey" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the backend REST API base URL.
 *
 * @remarks
 * Reads `Endpoints:Api` from exp.  Falls back to `process.env.API_URL` when
 * exp is unavailable.
 *
 * @returns Base URL string (e.g. `"https://api.arolariu.ro"`).
 */
export async function fetchApiUrl(): Promise<string> {
  try {
    const value = await fetchConfigValue(EXP_KEY_API_URL);
    if (value) return value;
  } catch {
    // Fall through to env fallback.
  }
  return process.env["API_URL"] ?? "";
}

/**
 * Returns the HS256 JWT signing secret used to mint BFF tokens.
 *
 * @remarks
 * Reads `Common:Auth:Secret` from exp.  Falls back to `process.env.API_JWT`
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
    // Fall through to env fallback.
  }
  return process.env["API_JWT"] ?? "";
}

/**
 * Returns the Resend transactional-email API key.
 *
 * @remarks
 * Reads `Communication:Resend:ApiKey` from exp (optional config key).
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
    // Fall through to env fallback.
  }
  return process.env["RESEND_API_KEY"] ?? "";
}
