import type {ServiceSeries} from "../types/status";
import {weightedUptime} from "./weightedUptime";

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
    const uptime = weightedUptime(s.buckets);
    if (uptime < worst.uptime || (uptime === worst.uptime && s.service < worst.service)) {
      worst = {service: s.service, uptime};
    }
  }
  /* v8 ignore next */
  return worst.uptime === Infinity ? {service: "", uptime: 100} : worst;
}
