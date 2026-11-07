/**
 * @fileoverview Presentation-only credential redaction before bounding report excerpts.
 * @module github/scripts/helpers/reports/redact
 * @remarks Root Newman execution still owns token transport and artifact sanitization.
 * These defensive patterns do not request, retain, or re-transport its auth token.
 */

/**
 * Removes recognizable bearer/JWT/key material from presentation text.
 * @param value - Complete evidence text, before any new truncation.
 * @returns Redacted text; never invoke this only after slicing a credential.
 */
export function redactEvidenceText(value: string): string {
  return value
    .replace(/\b(Bearer\s+)[^\s"'<>`]+/gi, "$1[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(
      /(["']?(?:password|client[_-]?secret|access[_-]?token|refresh[_-]?token|api[_-]?key)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|[^\s"'<>`]+)/gi,
      "$1[REDACTED]",
    );
}

/**
 * Redacts string leaves and sensitive-key values in parsed JSON evidence.
 * @param value - Untrusted JSON-compatible evidence.
 * @returns A new presentation value; it is still unknown until decoded by its owner.
 */
export function redactEvidenceValue(value: unknown): unknown {
  if (typeof value === "string") return redactEvidenceText(value);
  if (Array.isArray(value)) return value.map(redactEvidenceValue);
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [
        key,
        /(?:token|authorization|password|secret|cookie|api[_-]?key)/i.test(key) ? "[REDACTED]" : redactEvidenceValue(value),
      ]),
    );
  return value;
}
