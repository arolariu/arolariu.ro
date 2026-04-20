/**
 * Format a duration in milliseconds as a human-readable string.
 * Returns "—" for undefined/null/NaN inputs.
 *
 * Examples:
 *   formatDuration(undefined)   === "—"
 *   formatDuration(45_000)      === "1 min"
 *   formatDuration(60 * 60_000) === "1 h"
 *   formatDuration(90 * 60_000) === "1 h 30 min"
 */
export function formatDuration(ms: number | undefined): string {
  if (!ms || !Number.isFinite(ms)) return "—";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${hr} h` : `${hr} h ${rem} min`;
}
