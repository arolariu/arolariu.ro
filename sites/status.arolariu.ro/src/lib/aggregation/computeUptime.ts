import type {Bucket} from "../types/status";
import {weightedUptime} from "./weightedUptime";

export function computeUptime(buckets: readonly Bucket[]): number {
  return weightedUptime(buckets);
}
