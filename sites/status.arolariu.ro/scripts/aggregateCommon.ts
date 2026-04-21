import type {Bucket, BucketSize, HealthStatus, SubCheckSummary} from "../src/lib/types/status";

/**
 * Shared bucket/aggregation helpers used by the service-level and sub-check
 * grouping modules. Pure functions; no I/O.
 */

/**
 * Returns the UTC-ISO timestamp of the bucket containing `d` for the given
 * `BucketSize`. For `30m` rounds down to the most recent `:00` or `:30`;
 * for `1h` rounds down to the hour; for `1d` rounds down to 00:00Z.
 */
export function bucketStart(d: Date, size: BucketSize): string {
  const t = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
    size === "1d" ? 0 : d.getUTCHours(),
    size === "30m" ? Math.floor(d.getUTCMinutes() / 30) * 30 : 0,
    0, 0,
  ));
  return t.toISOString();
}

/** Severity-ordered comparison: returns whichever of `a`/`b` is worse. */
export function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
  const order: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};
  return order[a] >= order[b] ? a : b;
}

/** Linear-interpolated percentile over a numeric array; returns 0 for empty. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return Math.round(sorted[lo]! + (rank - lo) * (sorted[hi]! - sorted[lo]!));
}

/** Most-frequent value; returns the first value on tie (or undefined for empty). */
export function mode(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0]; let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) {best = v; bestCount = c;}
  return best;
}

/**
 * Accumulator shape collected per bucket by grouping passes, then folded
 * into a `Bucket` by `makeBucket`. Mutable by design — grouping passes
 * stream probes in and push into the arrays directly rather than
 * rebuilding on every probe.
 */
export interface BucketAccumulator {
  /** All `overall` (or sub-check) statuses seen in this bucket, in probe order. */
  statuses: HealthStatus[];
  /** All probe/sub-check latencies in ms, fed into `percentile`. */
  latencies: number[];
  /** Per-probe HTTP status codes; `mode` picks the most common for the bucket. */
  httpStatuses: number[];
  /** Sum of `sampleCount` across all probes in this bucket (defaults to 1 per probe for legacy single-sample probes). */
  sampleCount: number;
  /** Count of fully-Healthy samples within `sampleCount`; drives the uptime ratio. */
  healthySamples: number;
  /** Snapshot of the worst non-Healthy sub-check seen during the bucket; surfaced as the bucket's `worstSubCheck`. */
  worstSub?: {name: string; status: HealthStatus; description?: string};
}

/** Fold a `BucketAccumulator` into a concrete `Bucket`. */
export function makeBucket(t: string, acc: BucketAccumulator): Bucket {
  const worstOverall = acc.statuses.reduce(worstStatus, "Healthy" as HealthStatus);
  const httpMode = mode(acc.httpStatuses);
  const base: Bucket = {
    t,
    status: worstOverall,
    probes: {healthy: acc.healthySamples, total: acc.sampleCount},
    latency: {
      p50: percentile(acc.latencies, 50),
      p75: percentile(acc.latencies, 75),
      p95: percentile(acc.latencies, 95),
      p99: percentile(acc.latencies, 99),
    },
  };
  let worstSubCheck: SubCheckSummary | undefined;
  if (acc.worstSub !== undefined) {
    worstSubCheck = acc.worstSub.description !== undefined
      ? {name: acc.worstSub.name, status: acc.worstSub.status, description: acc.worstSub.description}
      : {name: acc.worstSub.name, status: acc.worstSub.status};
  }
  return {
    ...base,
    ...(httpMode !== undefined && {httpStatus: httpMode}),
    ...(worstSubCheck !== undefined && {worstSubCheck}),
  };
}
