import type {FilterWindow, IncidentsFile, ServiceSeries} from "../types/status";
import {WINDOW_TO_DAYS} from "../types/status";

const MS_PER_DAY = 86_400_000;

/**
 * Overall uptime % across all services, all buckets in the provided
 * ServiceSeries. Weighted by probe counts — a service with more probes
 * contributes more to the average (this matches user intuition of
 * "how often were we reachable overall").
 *
 * Returns 100 when denominator is 0 (no data yet).
 * Returns a number with up to 3 decimal places. The hero "Overall
 * uptime" card is the only consumer that needs "five-nines" precision
 * (e.g. 99.999%); per-service uptime + worst-uptime displays keep the
 * 1-decimal convention via weightedUptime().
 */
export function computeOverallUptime(services: readonly ServiceSeries[]): number {
  let healthy = 0;
  let total = 0;
  for (const s of services) {
    for (const b of s.buckets) {
      healthy += b.probes.healthy;
      total += b.probes.total;
    }
  }
  if (total === 0) return 100;
  return Math.round((healthy / total) * 100_000) / 1000;
}

/**
 * Unweighted mean of p50 latencies across all buckets across all services.
 * Unweighted intentionally: a bursty outage shouldn't dominate the
 * "typical p50" display; we want "across the window, what's the usual p50?".
 *
 * Returns 0 for empty input.
 */
export function computeAvgLatency(services: readonly ServiceSeries[]): number {
  let sum = 0;
  let count = 0;
  for (const s of services) {
    for (const b of s.buckets) {
      sum += b.latency.p50;
      count++;
    }
  }
  if (count === 0) return 0;
  return Math.round(sum / count);
}

export interface IncidentCounts {
  readonly total: number;
  readonly open: number;
  readonly resolved: number;
}

/**
 * Incident counts scoped to a window. `startedAt` within `WINDOW_TO_DAYS[windowFilter]` days.
 */
export function computeIncidentCount(incidents: IncidentsFile | null, windowFilter: FilterWindow): IncidentCounts {
  if (!incidents) return {total: 0, open: 0, resolved: 0};
  const cutoffMs = Date.now() - WINDOW_TO_DAYS[windowFilter] * MS_PER_DAY;
  const scoped = incidents.incidents.filter(inc => Date.parse(inc.startedAt) >= cutoffMs);
  const open = scoped.filter(i => i.status === "open").length;
  const resolved = scoped.filter(i => i.status === "resolved").length;
  return {total: scoped.length, open, resolved};
}

/**
 * Mean time to resolve (durationMs) of resolved incidents in the window.
 * Returns undefined when no resolved incidents exist in the window
 * (UI falls back to "—").
 */
export function computeMttr(incidents: IncidentsFile | null, windowFilter: FilterWindow): number | undefined {
  if (!incidents) return undefined;
  const cutoffMs = Date.now() - WINDOW_TO_DAYS[windowFilter] * MS_PER_DAY;
  const resolved = incidents.incidents.filter(
    inc => inc.status === "resolved"
      && Date.parse(inc.startedAt) >= cutoffMs
      && typeof inc.durationMs === "number"
  );
  if (resolved.length === 0) return undefined;
  const sum = resolved.reduce((s, inc) => s + (inc.durationMs ?? 0), 0);
  return Math.round(sum / resolved.length);
}
