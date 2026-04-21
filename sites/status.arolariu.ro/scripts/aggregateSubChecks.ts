import type {BucketSize, ProbeResult, ServiceId} from "../src/lib/types/status";
import {bucketStart, type BucketAccumulator} from "./aggregateCommon";

/**
 * Bucket the sub-check results out of each probe, grouped by
 * `[service → subCheckName → bucketStart]`. Probes without a `subChecks`
 * array are skipped entirely.
 */
export function groupSubChecks(
  probes: readonly ProbeResult[],
  size: BucketSize,
): Map<ServiceId, Map<string, Map<string, BucketAccumulator>>> {
  const byService = new Map<ServiceId, Map<string, Map<string, BucketAccumulator>>>();
  for (const p of probes) {
    if (!p.subChecks) continue;
    const bucket = bucketStart(new Date(p.timestamp), size);
    let perService = byService.get(p.service);
    if (!perService) {perService = new Map(); byService.set(p.service, perService);}
    const samples = p.sampleCount ?? 1;
    for (const sc of p.subChecks) {
      let perSub = perService.get(sc.name);
      if (!perSub) {perSub = new Map(); perService.set(sc.name, perSub);}
      let acc = perSub.get(bucket);
      if (!acc) {acc = {statuses: [], latencies: [], httpStatuses: [], sampleCount: 0, healthySamples: 0}; perSub.set(bucket, acc);}
      acc.statuses.push(sc.status);
      // Mirror the main-service fan-out: if the probe captured per-sample
      // sub-check durations, feed all of them into the percentile calc. Legacy
      // rows without `sampleDurationsMs` still contribute a single data point.
      if (sc.sampleDurationsMs !== undefined && sc.sampleDurationsMs.length > 0) {
        for (const d of sc.sampleDurationsMs) acc.latencies.push(d);
      } else {
        acc.latencies.push(sc.durationMs);
      }
      acc.sampleCount += samples;
      if (sc.status === "Healthy") acc.healthySamples += samples;
    }
  }
  return byService;
}
