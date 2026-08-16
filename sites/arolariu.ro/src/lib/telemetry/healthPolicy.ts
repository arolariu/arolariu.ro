/**
 * @fileoverview Health and connectivity telemetry suppression policy.
 * @module sites/arolariu.ro/src/lib/telemetry/healthPolicy
 *
 * @remarks
 * Sole owner of the suppressed path list for the website. Consumed by the OpenTelemetry
 * ignore hooks in `instrumentation.server.ts`. Deliberately free of `server-only` so it
 * remains directly unit-testable.
 */

/** Paths whose telemetry is suppressed. Matched exactly, never by prefix. */
export const SUPPRESSED_HEALTH_PATHS: readonly string[] = ["/health", "/api/health", "/api/ready"];

/** Environment variable controlling suppression. Only the literal `false` disables it. */
export const SUPPRESSION_ENV_VAR = "OTEL_SUPPRESS_HEALTH_TELEMETRY";

/**
 * Parses the raw suppression environment variable value.
 * @param rawValue The raw environment variable value, possibly undefined or malformed.
 * @returns `false` only when the value is exactly `false`, case-insensitively.
 */
export function parseSuppressionFlag(rawValue: string | undefined): boolean {
  if (rawValue === undefined || rawValue.trim() === "") return true;
  return rawValue.trim().toLowerCase() !== "false";
}

function normalize(path: string): string {
  const queryIndex = path.indexOf("?");
  const withoutQuery = queryIndex === -1 ? path : path.slice(0, queryIndex);
  if (withoutQuery.length <= 1) return withoutQuery;

  // Trailing slashes are trimmed by scanning rather than with /\/+$/u: the quantifier in
  // that pattern backtracks super-linearly on adversarial input (sonarjs/super-linear-regex).
  let end = withoutQuery.length;
  while (end > 0 && withoutQuery[end - 1] === "/") end--;
  return withoutQuery.slice(0, end);
}

/**
 * Determines whether a path is one of the suppressed health endpoints.
 * @param path The request path, with or without a query string.
 * @returns True when the normalized path matches a suppressed endpoint exactly.
 */
export function isSuppressedPath(path: string | undefined): boolean {
  if (path === undefined || path === "") return false;
  const normalized = normalize(path).toLowerCase();
  return SUPPRESSED_HEALTH_PATHS.includes(normalized);
}

/**
 * Determines whether telemetry should be suppressed for a path.
 * @param path The request path, with or without a query string.
 * @returns True when telemetry must be suppressed.
 * @remarks
 * Fails safe toward suppression: an unset or malformed env var leaves suppression
 * enabled, so cost control holds even when the environment is misconfigured. Only the
 * literal `false` re-enables health telemetry.
 */
export function shouldSuppressTelemetry(path: string | undefined): boolean {
  return parseSuppressionFlag(process.env[SUPPRESSION_ENV_VAR]) && isSuppressedPath(path);
}
