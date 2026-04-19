import type {Bucket} from "../types/status";

export function computeUptime(buckets: readonly Bucket[]): number {
  if (buckets.length === 0) return 100;
  let healthy = 0;
  let total = 0;
  for (const b of buckets) {
    if (b.status === "Healthy") continue;
    healthy += b.status === "Unhealthy" ? 0 : b.probes.healthy;
    total += b.probes.total;
  }
  if (total === 0) return 100;
  return Math.round((healthy / total) * 1000) / 10;
}

export function computeAvgLatency(buckets: readonly Bucket[]): number {
  if (buckets.length === 0) return 0;
  const sum = buckets.reduce((acc, b) => acc + b.latency.p50, 0);
  return Math.round(sum / buckets.length);
}
