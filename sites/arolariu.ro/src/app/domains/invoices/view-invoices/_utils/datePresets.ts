/**
 * @fileoverview Pure helpers for the date-range quick-preset filter buttons.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/datePresets
 *
 * @remarks
 * `computePresetRange` produces the {from, to} ISO date strings (YYYY-MM-DD)
 * corresponding to each preset at a given instant. `deriveActivePreset`
 * inverts that mapping: given the current from/to values, returns the key
 * of the preset that exactly matches them (or "custom" / null).
 *
 * All dates use the UTC day boundary for stability across timezones — the
 * existing `useFilteredInvoices` filter compares against `toSafeDate(...)`
 * which is timezone-naive, so day-level granularity is what matters.
 */

export type DatePresetKey = "30d" | "90d" | "ytd" | "all";

/**
 * Formats a Date as a YYYY-MM-DD ISO date string (no time component).
 */
function toIsoDate(d: Date): string {
  const year = d.getUTCFullYear().toString().padStart(4, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the [from, to] ISO date range a preset represents at `now`.
 *
 * - "30d" → from = now − 30 days, to = now
 * - "90d" → from = now − 90 days, to = now
 * - "ytd" → from = January 1 of `now`'s year, to = now
 * - "all" → from = null, to = null (clears the date filter)
 */
export function computePresetRange(preset: DatePresetKey, now: Date): {from: string | null; to: string | null} {
  if (preset === "all") return {from: null, to: null};
  const to = toIsoDate(now);
  if (preset === "ytd") {
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return {from: toIsoDate(yearStart), to};
  }
  const days = preset === "30d" ? 30 : 90;
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - days);
  return {from: toIsoDate(from), to};
}

/**
 * Inverse of {@link computePresetRange}. Returns the preset key whose range
 * exactly matches the supplied from/to (date-only equality, ignoring time),
 * or `"custom"` when both are set but match no preset, or `null` when both
 * are null.
 */
export function deriveActivePreset(
  from: string | null,
  to: string | null,
  now: Date,
): DatePresetKey | "custom" | null {
  if (from === null && to === null) return null;
  for (const preset of ["30d", "90d", "ytd"] as const) {
    const range = computePresetRange(preset, now);
    if (range.from === from && range.to === to) return preset;
  }
  return "custom";
}
