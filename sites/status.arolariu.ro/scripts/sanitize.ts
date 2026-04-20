/**
 * Strips anything that looks like a URL (scheme://…). Upstream health
 * endpoints routinely echo back fully-qualified connection strings in
 * failure descriptions; surfacing those on a public status page would leak
 * hostnames, ports, and occasionally credentials.
 */
const URL_PATTERN = /[A-Za-z][+\-.\w]*:\/\/\S+/g;

/**
 * Known secret-bearing key=value and header patterns scrubbed before
 * surfacing any upstream-supplied description. Keep additions global and
 * case-insensitive; a missed variant leaks a credential.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  /password=\S+/gi,
  /key=\S+/gi,
  /token=\S+/gi,
  /secret=\S+/gi,
  /\bbearer\s+\S+/gi,
  /\bauthorization:\s*\S+/gi,
];

/** Hard cap on description length surfaced to clients; prevents unbounded body text from bloating bucket payloads. */
const MAX_LEN = 200;

/**
 * Scrub URLs and common secret patterns out of an upstream health-check
 * description, then truncate to {@link MAX_LEN} characters. Returns
 * `undefined` passthrough so call sites can forward optional descriptions
 * verbatim.
 *
 * @param input - Raw description as emitted by the upstream service, or `undefined`.
 * @returns The sanitised string, or `undefined` if the input was `undefined`.
 */
export function sanitizeDescription(input: string | undefined): string | undefined {
  if (input === undefined) return undefined;
  let out = input.replace(URL_PATTERN, "");
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "");
  }
  if (out.length > MAX_LEN) {
    out = `${out.slice(0, MAX_LEN)}…`;
  }
  return out;
}
