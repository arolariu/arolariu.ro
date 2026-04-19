import type {HealthStatus, ServiceSeries} from "../types/status";

const ORDER: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};

export function deriveLatestStatus(series: ServiceSeries): HealthStatus {
  if (series.buckets.length === 0) return "Healthy";
  return series.buckets[series.buckets.length - 1].status;
}

export function deriveOverallStatus(services: readonly ServiceSeries[]): HealthStatus {
  let worst: HealthStatus = "Healthy";
  for (const s of services) {
    const latest = deriveLatestStatus(s);
    if (ORDER[latest] > ORDER[worst]) worst = latest;
  }
  return worst;
}
