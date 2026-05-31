/**
 * Format a duration in milliseconds as a human-readable string.
 * Returns "—" for undefined/null/NaN inputs. 0 ms renders as "0 min".
 *
 * Examples:
 *   formatDuration(undefined)   === "—"
 *   formatDuration(0)           === "0 min"
 *   formatDuration(45_000)      === "1 min"
 *   formatDuration(60 * 60_000) === "1 h"
 *   formatDuration(90 * 60_000) === "1 h 30 min"
 */
export function formatDuration(milliseconds: number | null | undefined): string {
  if (milliseconds === null || milliseconds === undefined || !Number.isFinite(milliseconds)) return "—";
  const minutes = Math.round(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours} h` : `${hours} h ${remainingMinutes} min`;
}
