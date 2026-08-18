/**
 * @fileoverview Privacy-preserving serialization helpers for telemetry logs.
 * @module lib/telemetry/logSanitizer
 *
 * @remarks
 * Telemetry is an operational data boundary. These functions retain only
 * bounded, low-cardinality attributes and reject identifiers, storage
 * locations, credentials, and exception content before any console or OTLP
 * serialization is performed.
 */

type SafeLogValue = boolean | number | string;

const SAFE_ATTRIBUTE_KEYS = new Set([
  "count",
  "httpStatus",
  "errorCode",
  "status",
  "attempt",
  "durationMs",
  "retryCount",
  "result",
  "http.method",
  "http.status_code",
  "http.route",
  "next.render_context",
  "next.route",
  "next.page_type",
  "next.server_components",
  "next.cache_hit",
  "next.runtime",
  "user.authenticated",
  "user.role",
  "auth.method",
  "auth.provider",
  "cache.system",
  "cache.operation",
  "cache.hit",
  "db.system",
  "db.operation",
  "app.log.context",
]);

const SENSITIVE_KEY =
  /(authorization|blob|cookie|credential|email|exception|id$|identifier|location|owner|password|sas|scan|secret|sig(nature)?|stack|token|url|uri|user)/iu;
const SENSITIVE_VALUE =
  /(?:https?:\/\/|[?&](?:sig|token|sas|signature|authorization)=|\b(?:bearer|token|secret|password)\b|[\w.+-]+@[\w.-]+\.\w+)/iu;
const MAXIMUM_STRING_LENGTH = 128;

function sanitizeValue(value: unknown): SafeLogValue | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || SENSITIVE_VALUE.test(value)) {
    return null;
  }

  return value.slice(0, MAXIMUM_STRING_LENGTH);
}

/**
 * Retains only safe operational attributes for structured logging.
 *
 * @param attributes - Untrusted attributes offered by a telemetry caller.
 * @returns A serializable record that contains no sensitive keys or values.
 */
export function sanitizeLogAttributes(attributes: Readonly<Record<string, unknown>> | undefined): Record<string, SafeLogValue> {
  if (attributes === undefined) {
    return {};
  }

  const sanitized: Record<string, SafeLogValue> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (
      !SAFE_ATTRIBUTE_KEYS.has(key)
      || (SENSITIVE_KEY.test(key) && key !== "user.authenticated" && key !== "user.role")
      || (key === "errorCode" && (typeof value !== "string" || !/^[A-Z_]{1,64}$/u.test(value)))
      || ((key === "status" || key === "result") && (typeof value !== "string" || !/^[a-z_]{1,32}$/u.test(value)))
    ) {
      continue;
    }

    const safeValue = sanitizeValue(value);
    if (safeValue !== null) {
      sanitized[key] = safeValue;
    }
  }

  return sanitized;
}

/**
 * Converts an untrusted log message into safe, bounded event text.
 *
 * @param message - Caller-provided log message.
 * @returns The original bounded event text, or a stable redaction event.
 */
export function sanitizeLogMessage(message: string): string {
  return SENSITIVE_VALUE.test(message) || message.length > MAXIMUM_STRING_LENGTH ? "telemetry.event.redacted" : message;
}
