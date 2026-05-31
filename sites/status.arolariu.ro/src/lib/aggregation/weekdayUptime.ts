import type {ServiceSeries} from "../types/status";

const WEEKDAY_COUNT = 7;

function getIsoWeekdayIndex(timestamp: string): number {
  const date = new Date(timestamp);
  return (date.getUTCDay() + 6) % WEEKDAY_COUNT;
}

function incrementAt(values: number[], index: number, amount: number): void {
  // eslint-disable-next-line security/detect-object-injection -- index is always produced by getIsoWeekdayIndex in [0..6].
  values[index] = (values[index] ?? 0) + amount;
}

/**
 * Uptime % per weekday (Mon..Sun, ISO order). Aggregated across services.
 * A weekday with no probes returns 100 (no proven failure).
 *
 * Uses UTC weekday to make aggregation deterministic across timezones —
 * a bucket's wall-clock weekday is defined by its ISO timestamp, not the
 * viewer's local time. Values are rounded to one decimal.
 */
export function computeWeekdayUptime(services: readonly ServiceSeries[]): readonly number[] {
  const healthy = Array.from({length: WEEKDAY_COUNT}, () => 0);
  const total = Array.from({length: WEEKDAY_COUNT}, () => 0);
  for (const serviceSeries of services) {
    for (const bucket of serviceSeries.buckets) {
      const weekdayIndex = getIsoWeekdayIndex(bucket.t);
      incrementAt(healthy, weekdayIndex, bucket.probes.healthy);
      incrementAt(total, weekdayIndex, bucket.probes.total);
    }
  }
  return healthy.map((healthyCount, weekdayIndex) => {
    // eslint-disable-next-line security/detect-object-injection -- weekdayIndex is produced by Array.map over the fixed weekday array.
    const totalCount = total[weekdayIndex] ?? 0;
    return totalCount === 0 ? 100 : Math.round((healthyCount / totalCount) * 1000) / 10;
  });
}
