import type {ServiceSeries} from "../types/status";

export interface WorstUptime {
  readonly service: string;
  readonly uptime: number;
}

/**
 * Service with the lowest probe-weighted uptime across the provided series.
 * Ties broken alphabetically by service name (deterministic).
 * Returns {service: "", uptime: 100} for empty input.
 * Services with zero probes count as 100% (no data = no proven failure).
 */
export function computeWorstUptime(services: readonly ServiceSeries[]): WorstUptime {
  if (services.length === 0) return {service: "", uptime: 100};
  let worst: WorstUptime = {service: "", uptime: Infinity};
  for (const s of services) {
    let healthy = 0;
    let total = 0;
    for (const b of s.buckets) {
      healthy += b.probes.healthy;
      total += b.probes.total;
    }
    const uptime = total === 0 ? 100 : Math.round((healthy / total) * 1000) / 10;
    if (uptime < worst.uptime || (uptime === worst.uptime && s.service < worst.service)) {
      worst = {service: s.service, uptime};
    }
  }
  return worst.uptime === Infinity ? {service: "", uptime: 100} : worst;
}
