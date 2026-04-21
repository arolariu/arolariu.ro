import type {BucketSize, ProbeResult, ServiceId} from "../src/lib/types/status";
import {bucketStart, worstStatus, type BucketAccumulator} from "./aggregateCommon";

/**
 * Bucket probes by service and bucket-start timestamp, accumulating the
 * main-service (`overall`) health signal. Sub-check breakdowns are handled
 * separately by `groupSubChecks` (see `aggregateSubChecks.ts`).
 */
export function groupProbes(
  probes: readonly ProbeResult[],
  size: BucketSize,
): Map<ServiceId, Map<string, BucketAccumulator>> {
  const byService = new Map<ServiceId, Map<string, BucketAccumulator>>();
  for (const p of probes) {
    const bucket = bucketStart(new Date(p.timestamp), size);
    let perService = byService.get(p.service);
    if (!perService) {perService = new Map(); byService.set(p.service, perService);}
    let acc = perService.get(bucket);
    if (!acc) {acc = {statuses: [], latencies: [], httpStatuses: [], sampleCount: 0, healthySamples: 0}; perService.set(bucket, acc);}
    const samples = p.sampleCount ?? 1;
    acc.statuses.push(p.overall);
    // Fan out per-sample latencies when the probe persisted them; fall back to
    // the single aggregated median for legacy rows pre-dating `sampleLatenciesMs`.
    // This is what keeps bucket-level p50/p75/p95/p99 distinct — one latency
    // per bucket collapses every percentile to the same number.
    if (p.sampleLatenciesMs !== undefined && p.sampleLatenciesMs.length > 0) {
      for (const l of p.sampleLatenciesMs) acc.latencies.push(l);
    } else {
      acc.latencies.push(p.latencyMs);
    }
    acc.httpStatuses.push(p.httpStatus);
    acc.sampleCount += samples;
    if (p.overall === "Healthy") acc.healthySamples += samples;
    if (p.subChecks) {
      for (const sc of p.subChecks) {
        if (sc.status !== "Healthy") {
          if (!acc.worstSub || worstStatus(acc.worstSub.status, sc.status) === sc.status) {
            acc.worstSub = sc.description !== undefined
              ? {name: sc.name, status: sc.status, description: sc.description}
              : {name: sc.name, status: sc.status};
          }
        }
      }
    }
  }
  return byService;
}
