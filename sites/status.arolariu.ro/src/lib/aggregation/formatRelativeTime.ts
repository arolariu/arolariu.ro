/**
 * Human-readable "X min/h/d ago" relative-time formatter shared by the
 * status-banner, segment-tooltip, and any other short-form timestamp.
 *
 * Uses `Math.floor` so that e.g. 59.6s ago still renders "just now",
 * 1m30s ago renders "1 min ago". Future timestamps return "upcoming".
 *
 * @param iso ISO-8601 timestamp (or undefined — returns "").
 * @param nowMs Optional clock reading, for deterministic tests. Defaults to `Date.now()`.
 */
export function formatRelativeTime(iso: string | undefined, nowMs: number = Date.now()): string {
  if (!iso) return "";
  const ms = nowMs - Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  if (ms < 0) return "upcoming";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  return `${Math.floor(hr / 24)} d ago`;
}
