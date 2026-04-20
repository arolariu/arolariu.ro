import type {Bucket} from "../types/status";
import {weightedUptime} from "./weightedUptime";

export function computeUptime(buckets: readonly Bucket[]): number {
  return weightedUptime(buckets);
}

export function computeAvgLatency(buckets: readonly Bucket[]): number {
  if (buckets.length === 0) return 0;
  const sum = buckets.reduce((acc, b) => acc + b.latency.p50, 0);
  return Math.round(sum / buckets.length);
}
