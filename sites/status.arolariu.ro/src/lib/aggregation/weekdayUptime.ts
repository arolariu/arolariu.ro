import type {ServiceSeries} from "../types/status";

/**
 * Uptime % per weekday (Mon..Sun, ISO order). Aggregated across services.
 * A weekday with no probes returns 100 (no proven failure).
 *
 * Uses UTC weekday to make aggregation deterministic across timezones —
 * a bucket's wall-clock weekday is defined by its ISO timestamp, not the
 * viewer's local time. Values are rounded to one decimal.
 */
export function computeWeekdayUptime(services: readonly ServiceSeries[]): readonly number[] {
  // Fixed-length 7-element buckets (Mon..Sun). `idx` is always in [0..6] so
  // the array access is always defined; non-null assertion keeps the hot
  // path allocation-free under noUncheckedIndexedAccess.
  const healthy = new Array<number>(7).fill(0);
  const total = new Array<number>(7).fill(0);
  for (const s of services) {
    for (const b of s.buckets) {
      const d = new Date(b.t);
      // getUTCDay: 0=Sun..6=Sat. ISO weekday: 0=Mon..6=Sun. Map: (getUTCDay + 6) % 7.
      const idx = (d.getUTCDay() + 6) % 7;
      healthy[idx]! += b.probes.healthy;
      total[idx]! += b.probes.total;
    }
  }
  return healthy.map((h, i) => {
    const t = total[i]!;
    return t === 0 ? 100 : Math.round((h / t) * 1000) / 10;
  });
}
