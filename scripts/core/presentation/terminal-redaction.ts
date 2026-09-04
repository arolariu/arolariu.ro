/**
 * @fileoverview Redaction algorithms shared by composed terminal presentation.
 * @module scripts/core/presentation/terminal-redaction
 *
 * @remarks
 * Split out of `composed-terminal-presenter.ts` to keep that module inside the 500-line budget.
 * The presenter still owns the redaction *registry*; these are the two pure algorithms it applies.
 */

const REDACTION_MARKER = "[REDACTED]";

/**
 * Replaces registered sensitive values, applying longest values first.
 *
 * @param text - Text about to be written to a sink.
 * @param redactions - Registered sensitive literal values.
 * @param includeJsonEscapes - Whether JSON-escaped variants are also sensitive.
 * @returns Redacted output text.
 */
export function redactText(text: string, redactions: ReadonlySet<string>, includeJsonEscapes: boolean): string {
  let redacted = text;
  const values = new Set<string>();
  for (const value of redactions) {
    values.add(value);
    if (includeJsonEscapes) {
      values.add(JSON.stringify(value).slice(1, -1));
    }
  }

  for (const value of [...values].toSorted((left, right) => right.length - left.length)) {
    redacted = redacted.replaceAll(value, REDACTION_MARKER);
  }

  return redacted;
}

/**
 * Finds a prefix that can be emitted without splitting a registered redaction.
 *
 * The boundary also never splits a surrogate pair, so a partially received astral character is
 * held back with the tail instead of being emitted as a lone surrogate.
 *
 * @param text - Buffered decoded stream text.
 * @param redactions - Registered sensitive literal values.
 * @returns Exclusive boundary of text safe to redact and emit immediately.
 */
export function findStreamingRedactionBoundary(text: string, redactions: ReadonlySet<string>): number {
  const values = [...redactions];
  if (values.length === 0) {
    return text.length;
  }

  const maximumLength = Math.max(...values.map((value) => value.length));
  let boundary = Math.max(0, text.length - maximumLength + 1);
  let changed = true;

  while (changed) {
    changed = false;
    for (const value of values) {
      let matchIndex = text.indexOf(value, Math.max(0, boundary - value.length + 1));
      while (matchIndex !== -1 && matchIndex < boundary) {
        if (matchIndex + value.length > boundary) {
          boundary = matchIndex;
          changed = true;
          break;
        }
        matchIndex = text.indexOf(value, matchIndex + 1);
      }
    }

    const precedingCodeUnit = boundary === 0 ? undefined : text.charCodeAt(boundary - 1);
    const followingCodeUnit = boundary === text.length ? undefined : text.charCodeAt(boundary);
    if (
      precedingCodeUnit !== undefined
      && followingCodeUnit !== undefined
      && precedingCodeUnit >= 0xd800
      && precedingCodeUnit <= 0xdbff
      && followingCodeUnit >= 0xdc00
      && followingCodeUnit <= 0xdfff
    ) {
      boundary--;
      changed = true;
    }
  }

  return boundary;
}
