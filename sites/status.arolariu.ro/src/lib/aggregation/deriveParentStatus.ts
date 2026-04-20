import type {HealthStatus, ServiceSeries} from "../types/status";

/** Severity ordering for HealthStatus. Higher numbers = worse state. */
const ORDER: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};

/**
 * Latest known health status for a service, taken from its most recent bucket.
 *
 * Invariant: buckets are sorted ascending by `t` (produced by `toSeries` and
 * `mergeAggregate` in scripts/aggregate.ts, and preserved by `sliceWindow`).
 * So the last bucket is the most recent one.
 *
 * Returns `"Healthy"` when the series has no buckets (fresh service with
 * no probes yet — absence of data is treated as healthy, matching the
 * "no proven failure" convention used elsewhere).
 */
export function deriveLatestStatus(series: ServiceSeries): HealthStatus {
  const last = series.buckets[series.buckets.length - 1];
  return last?.status ?? "Healthy";
}

/**
 * Worst-of-latest across a service list — the aggregate health for the
 * overall page banner. Returns the most severe `deriveLatestStatus` result
 * across all services, using the severity ordering Healthy < Degraded < Unhealthy.
 */
export function deriveOverallStatus(services: readonly ServiceSeries[]): HealthStatus {
  let worst: HealthStatus = "Healthy";
  for (const s of services) {
    const latest = deriveLatestStatus(s);
    if (ORDER[latest] > ORDER[worst]) worst = latest;
  }
  return worst;
}
