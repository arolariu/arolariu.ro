/**
 * @fileoverview Secret redaction for every Newman report artifact: sensitive-key detection, bearer
 * and bare JWT masking, exact runtime-token replacement, and the recursive JSON walk the JSON
 * reporter sanitization uses. Every rule here is content-level: it makes a *retained artifact*
 * safe. The presenter-level guarantee is separate and stronger — the workflow registers a present
 * token with the presenter before any command is constructed, so no diagnostic ever carries it.
 * @module scripts/features/end-to-end/redaction */

/** Object keys whose value is replaced wholesale, whatever it contains. */
const SENSITIVE_KEY_PATTERN = /(authorization|auth[_-]?token|access[_-]?token|refresh[_-]?token|id[_-]?token|token)/i;
const JWT_REPLACEMENT_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const JWT_DETECTION_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const BEARER_JWT_REPLACEMENT_PATTERN = /Bearer\s+eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_JWT_DETECTION_PATTERN = /Bearer\s+eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;

/** Mutable counter of performed redactions, shared across one artifact's sanitization walk. */
export interface SanitizeAccumulator {
  redactionCount: number;
}

/** One sanitized text body and the number of redaction rules that changed it. */
export interface RedactedReportText {
  readonly content: string;
  readonly redactionCount: number;
}

/** Reports whether text still carries a bearer or bare JWT-shaped pattern after sanitization. */
export function containsJwtPattern(text: string): boolean {
  return BEARER_JWT_DETECTION_PATTERN.test(text) || JWT_DETECTION_PATTERN.test(text);
}

/** Applies the exact-token, bearer-JWT, and bare-JWT redaction rules to one text body, in that
 * order, counting one pass per rule that changed the content. */
export function redactReportText(value: string, runtimeAuthToken: string | undefined): RedactedReportText {
  let content = value;
  let redactionCount = 0;

  if (runtimeAuthToken !== undefined && runtimeAuthToken.length > 0) {
    const withoutToken = content.replaceAll(runtimeAuthToken, "[REDACTED]");
    if (withoutToken !== content) {
      redactionCount++;
      content = withoutToken;
    }
  }

  const withoutBearer = content.replace(BEARER_JWT_REPLACEMENT_PATTERN, "******");
  if (withoutBearer !== content) {
    redactionCount++;
    content = withoutBearer;
  }

  const withoutJwt = content.replace(JWT_REPLACEMENT_PATTERN, "[REDACTED_JWT]");
  if (withoutJwt !== content) {
    redactionCount++;
    content = withoutJwt;
  }

  return {content, redactionCount};
}

/** Redacts known secret patterns from one string value: a non-empty value under a sensitive `key` is
 * replaced wholesale, and every other value goes through {@link redactReportText}. */
export function redactSensitiveString(
  value: string,
  key: string | null,
  accumulator: SanitizeAccumulator,
  runtimeAuthToken?: string,
): string {
  if (key !== null && SENSITIVE_KEY_PATTERN.test(key) && value.trim().length > 0) {
    accumulator.redactionCount++;
    return "[REDACTED]";
  }

  const {content, redactionCount} = redactReportText(value, runtimeAuthToken);
  accumulator.redactionCount += redactionCount;
  return content;
}

/** Recursively sanitizes JSON-compatible values for secure artifact storage. */
export function sanitizeJsonValue(
  value: unknown,
  accumulator: SanitizeAccumulator,
  key: string | null = null,
  runtimeAuthToken?: string,
): unknown {
  if (typeof value === "string") {
    return redactSensitiveString(value, key, accumulator, runtimeAuthToken);
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => sanitizeJsonValue(item, accumulator, null, runtimeAuthToken));
  }
  if (typeof value === "object" && value !== null) {
    const sanitizedRecord: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      sanitizedRecord[entryKey] = sanitizeJsonValue(entryValue, accumulator, entryKey, runtimeAuthToken);
    }
    return sanitizedRecord;
  }

  return value;
}
