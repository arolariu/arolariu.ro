import type {Bucket} from "../types/status";

/**
 * Unweighted mean of p50 latencies across the provided buckets. Returns 0 for
 * empty input. Used by row-level "avg p50" readouts (`ServiceRow`,
 * `SubServiceRow`).
 *
 * Note: the overview summary uses a parallel, services-level
 * `computeAvgLatency(services)` in `summaryStats.ts` — same math, different
 * shape — kept separate so each call site reads the type it naturally holds
 * (a bucket array vs. a service-series list).
 */
export function computeAvgLatency(buckets: readonly Bucket[]): number {
  if (buckets.length === 0) return 0;
  const sum = buckets.reduce((acc, b) => acc + b.latency.p50, 0);
  return Math.round(sum / buckets.length);
}
