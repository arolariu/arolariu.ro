/**
 * @fileoverview Locale-aware regex/keyword tables for slot extraction.
 * @module app/domains/invoices/_components/ai/intents/slotLexicon
 *
 * @remarks
 * Layer 1 path: parses the user's question text against canonical
 * locale-specific phrasings. Returns null when nothing matches; the
 * caller (intentResolver) can then either fall through to Layer 2
 * (slot LLM) or apply defaults.
 */

import type {AssistantLocale, Timeframe} from "../types";

/** Lowercase + ASCII-fold (strip diacritics) for matching. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type TimeframePattern = {pattern: RegExp; result: Timeframe};

const TIMEFRAME_PATTERNS: Record<AssistantLocale, ReadonlyArray<TimeframePattern>> = {
  en: [
    {pattern: /\b(?:the\s+)?last\s+month\b/, result: "last-month"},
    {pattern: /\bthis\s+month\b/, result: "this-month"},
    {pattern: /\b(?:the\s+)?last\s+week\b/, result: "last-week"},
    {pattern: /\bthis\s+week\b/, result: "this-week"},
    {pattern: /\b(?:last|past)\s+(?:3|three)\s+months?\b/, result: "last-3-months"},
    {pattern: /\b(?:last|past)\s+(?:6|six)\s+months?\b/, result: "last-6-months"},
    {pattern: /\bthis\s+quarter\b/, result: "this-quarter"},
    {pattern: /\b(?:the\s+)?last\s+quarter\b/, result: "last-quarter"},
    {pattern: /\bthis\s+year\b/, result: "this-year"},
    {pattern: /\b(?:the\s+)?last\s+year\b/, result: "last-year"},
    {pattern: /\b(?:of\s+)?all\s+time\b/, result: "all-time"},
  ],
  ro: [
    {pattern: /\bluna\s+trecuta\b/, result: "last-month"},
    {pattern: /\bluna\s+aceasta\b/, result: "this-month"},
    {pattern: /\bsaptamana\s+trecuta\b/, result: "last-week"},
    {pattern: /\bsaptamana\s+aceasta\b/, result: "this-week"},
    {pattern: /\bultimele\s+3\s+luni\b/, result: "last-3-months"},
    {pattern: /\bultimele\s+6\s+luni\b/, result: "last-6-months"},
    {pattern: /\btrimestrul\s+acesta\b/, result: "this-quarter"},
    {pattern: /\btrimestrul\s+trecut\b/, result: "last-quarter"},
    {pattern: /\banul\s+trecut\b/, result: "last-year"},
    {pattern: /\banul\s+acesta\b/, result: "this-year"},
    {pattern: /\bdin\s+totdeauna\b/, result: "all-time"},
  ],
  fr: [
    {pattern: /\ble\s+mois\s+dernier\b/, result: "last-month"},
    {pattern: /\bce\s+mois\b/, result: "this-month"},
    {pattern: /\bla\s+semaine\s+derniere\b/, result: "last-week"},
    {pattern: /\bcette\s+semaine\b/, result: "this-week"},
    {pattern: /\bles\s+(?:3|trois)\s+derniers?\s+mois\b/, result: "last-3-months"},
    {pattern: /\bles\s+(?:6|six)\s+derniers?\s+mois\b/, result: "last-6-months"},
    {pattern: /\bce\s+trimestre\b/, result: "this-quarter"},
    {pattern: /\ble\s+trimestre\s+dernier\b/, result: "last-quarter"},
    {pattern: /\bcette\s+annee\b/, result: "this-year"},
    {pattern: /\bl'?\s*annee\s+derniere\b/, result: "last-year"},
    {pattern: /\bdepuis\s+toujours\b/, result: "all-time"},
  ],
};

export function parseTimeframe(text: string, locale: AssistantLocale): Timeframe | null {
  const normalized = normalize(text);
  for (const {pattern, result} of TIMEFRAME_PATTERNS[locale]) {
    if (pattern.test(normalized)) return result;
  }
  return null;
}

const WORD_NUMBERS: Record<AssistantLocale, Record<string, number>> = {
  en: {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10},
  ro: {unu: 1, doi: 2, trei: 3, patru: 4, cinci: 5, sase: 6, sapte: 7, opt: 8, noua: 9, zece: 10},
  fr: {un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10},
};

const TOPK_PATTERNS: Record<AssistantLocale, RegExp> = {
  en: /\btop\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/,
  ro: /\bprimele\s+(\d+|unu|doi|trei|patru|cinci|sase|sapte|opt|noua|zece)\b/,
  fr: /\bles\s+(\d+|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b/,
};

export function parseTopK(text: string, locale: AssistantLocale): number {
  const normalized = normalize(text);
  const match = TOPK_PATTERNS[locale].exec(normalized);
  if (!match) return 5;
  const token = match[1]!;
  const asNumber = Number.parseInt(token, 10);
  const value = Number.isFinite(asNumber) ? asNumber : (WORD_NUMBERS[locale][token] ?? 5);
  return Math.max(1, Math.min(20, value));
}